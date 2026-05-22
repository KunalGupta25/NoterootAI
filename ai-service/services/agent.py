"""
Agent service — implements the OpenAI function-calling loop.

Flow:
  1. Client sends AgentRequest with conversation history.
  2. We call the LLM with AGENT_TOOLS attached.
  3. If the LLM returns plain text we stream it as  data: {"type":"text","content":"…"}
  4. If the LLM calls a tool we emit:              data: {"type":"tool_request","tool":"…","args":{…},"call_id":"…"}
     and STOP. The stream ends. The frontend shows an Approve/Reject card.
  5. On Approve: frontend sends a NEW AgentRequest with tool_result populated.
     We resume: inject the tool result as a "tool" role message and re-call the LLM.
  6. On Reject: frontend sends a NEW AgentRequest with a user message saying the action was rejected.

The "search_notes" tool is the only one handled SERVER-SIDE (no user approval needed)
because it is read-only.  All write tools require approval.
"""

import json
import uuid
from typing import AsyncGenerator

from models import AgentRequest, AgentMessage
from services.agent_tools import AGENT_TOOLS
from services.retriever import search_notes
from models import SearchRequest
from providers.factory import get_provider

# Tools that are read-only and execute server-side (no approval needed)
SERVER_SIDE_TOOLS = {"search_notes"}

SYSTEM_PROMPT = """\
You are NoteRootAI Agent — an autonomous assistant that helps users organise, write, and manage their personal knowledge vault.

You have access to a set of tools to interact with the vault. Always follow this process:
1. Think step-by-step before using a tool.
2. If you need to find a note, use `search_notes` first to get the note_id.
3. Only call ONE tool per message. Wait for the result before calling the next.
4. After a tool result is returned, use the information to continue.
5. Be concise in your thinking messages between tool calls.
6. When you are fully done, respond with a clear final summary for the user.
7. CRITICAL: When writing or appending content using tools, you MUST preserve formatting by explicitly including `\\n` (newline characters). Never compress markdown tables, code blocks, or paragraphs into a single line.
8. NEVER put a code block (```) inside a markdown table cell, as it will break the table formatting. If you need to write code inside a table, use inline code (`code`) instead.

Never make up note_ids. Always search first."""


async def run_agent(request: AgentRequest) -> AsyncGenerator[str, None]:
    """
    Main agent streaming generator.
    Yields SSE-formatted JSON strings.
    """
    provider = get_provider(
        request.provider,
        request.api_key,
        custom_base_url=request.custom_base_url,
    )

    # Build the messages list for the LLM
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in request.messages:
        if msg.role == "tool":
            # Inject approved tool result back into the conversation
            messages.append({
                "role": "tool",
                "tool_call_id": msg.tool_call_id,
                "name": msg.tool_name,
                "content": msg.content,
            })
        elif msg.role == "assistant" and getattr(msg, "tool_calls", None):
            messages.append({
                "role": "assistant",
                "content": msg.content,
                "tool_calls": msg.tool_calls
            })
        else:
            messages.append({"role": msg.role, "content": msg.content})

    # Call the provider with tool support
    try:
        async for event in provider.agent_stream(
            messages=messages,
            tools=AGENT_TOOLS,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            # event is already a dict from the provider
            tool_name = event.get("tool")

            # If it's a server-side tool, execute it immediately and inject result
            if event.get("type") == "tool_request" and tool_name in SERVER_SIDE_TOOLS:
                args = event.get("args", {})
                call_id = event.get("call_id", str(uuid.uuid4()))

                # Execute search_notes server-side
                result_content = await _execute_server_tool(
                    tool_name, args, request
                )
                # Tell the client the tool ran silently (informational)
                yield f"data: {json.dumps({'type': 'tool_silent', 'tool': tool_name, 'result': result_content})}\n\n"

                # Now do a follow-up LLM call with the tool result injected
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{
                        "id": call_id,
                        "type": "function",
                        "function": {"name": tool_name, "arguments": json.dumps(args)}
                    }]
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": call_id,
                    "name": tool_name,
                    "content": json.dumps(result_content),
                })

                # Re-run from updated messages to get AI's next step
                async for follow_event in provider.agent_stream(
                    messages=messages,
                    tools=AGENT_TOOLS,
                    model=request.model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                ):
                    yield f"data: {json.dumps(follow_event)}\n\n"
                return  # Done after recursive follow-up

            # For write tools and text chunks, forward to client as-is
            yield f"data: {json.dumps(event)}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    yield "data: [DONE]\n\n"


async def _execute_server_tool(tool_name: str, args: dict, request: AgentRequest) -> dict:
    """Execute a read-only server-side tool and return the result."""
    if tool_name == "search_notes":
        search_req = SearchRequest(
            query=args.get("query", ""),
            provider=request.provider,
            api_key=request.api_key,
            custom_base_url=request.custom_base_url,
            top_k=5,
        )
        result = await search_notes(search_req)
        return {
            "results": [
                {"note_id": r.note_id, "title": r.title, "score": round(r.score, 3)}
                for r in result.results
            ]
        }
    return {}
