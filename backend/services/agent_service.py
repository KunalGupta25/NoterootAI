import json

from providers.factory import get_provider
from schemas.ai import AgentRequest

TOOLS = [
    {"type": "function", "function": {"name": name, "description": description, "parameters": {"type": "object", "properties": {}, "additionalProperties": True}}}
    for name, description in [
        ("search_notes", "Search the user's vault for notes relevant to a query."),
        ("read_note", "Read one note by its ID."),
        ("create_note", "Create a new note."),
        ("create_sub_note", "Create a note under a parent note."),
        ("append_to_note", "Append content to an existing note."),
        ("replace_note_content", "Replace a note's content."),
        ("update_note_title", "Rename a note."),
        ("delete_note", "Delete a note."),
        ("list_all_notes", "List the user's notes."),
    ]
]


async def run_agent(request: AgentRequest):
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
