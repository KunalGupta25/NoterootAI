import json
from providers.factory import get_provider
from schemas.ai import AgentRequest

TOOLS = [
    {"type": "function", "function": {"name": "create_note", "description": "Create a new note.", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}, "tags": {"type": "array", "items": {"type": "string"}}}, "required": ["title"]}}},
    {"type": "function", "function": {"name": "append_to_note", "description": "Append markdown content to a note.", "parameters": {"type": "object", "properties": {"note_id": {"type": "string"}, "note_title": {"type": "string"}, "content": {"type": "string"}}, "required": ["note_id", "content"]}}},
    {"type": "function", "function": {"name": "update_note_title", "description": "Rename a note.", "parameters": {"type": "object", "properties": {"note_id": {"type": "string"}, "new_title": {"type": "string"}}, "required": ["note_id", "new_title"]}}},
    {"type": "function", "function": {"name": "search_notes", "description": "Search the vault before modifying an existing note.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "read_note", "description": "Read a note by ID.", "parameters": {"type": "object", "properties": {"note_id": {"type": "string"}}, "required": ["note_id"]}}},
    {"type": "function", "function": {"name": "create_sub_note", "description": "Create a child note.", "parameters": {"type": "object", "properties": {"parent_id": {"type": "string"}, "title": {"type": "string"}, "content": {"type": "string"}}, "required": ["parent_id", "title"]}}},
    {"type": "function", "function": {"name": "replace_note_content", "description": "Replace a note's complete content.", "parameters": {"type": "object", "properties": {"note_id": {"type": "string"}, "content": {"type": "string"}}, "required": ["note_id", "content"]}}},
    {"type": "function", "function": {"name": "delete_note", "description": "Delete a note.", "parameters": {"type": "object", "properties": {"note_id": {"type": "string"}}, "required": ["note_id"]}}},
    {"type": "function", "function": {"name": "list_all_notes", "description": "List vault notes.", "parameters": {"type": "object", "properties": {}}}},
]


async def run_agent(request: AgentRequest):
    try:
        provider = get_provider(request.provider, request.api_key, request.custom_base_url)
        messages = [{"role": "system", "content": "You are NoteRootAI Agent. Use one tool at a time. Never invent note IDs; search first."}]
        for message in request.messages:
            entry = {"role": message.role, "content": message.content}
            if message.tool_call_id:
                entry["tool_call_id"] = message.tool_call_id
            if message.tool_name:
                entry["name"] = message.tool_name
            if message.tool_calls:
                entry["tool_calls"] = message.tool_calls
            messages.append(entry)
        async for event in provider.agent(messages, TOOLS, request.model, request.temperature, request.max_tokens):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as error:
        yield f"data: {json.dumps({'type': 'error', 'content': str(error)})}\n\n"
        yield "data: [DONE]\n\n"
