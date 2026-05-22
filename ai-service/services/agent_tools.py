"""
Agent tool definitions in OpenAI function-calling format.
All tools emit a JSON event to the frontend for user approval before execution.
"""

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_note",
            "description": (
                "Creates a brand-new note in the user's workspace. "
                "Use this when the user wants to write, draft, or capture something new."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title of the note."
                    },
                    "content": {
                        "type": "string",
                        "description": "The markdown content of the note."
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of tags to attach to the note."
                    }
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "append_to_note",
            "description": (
                "Appends new markdown content to the END of an existing note. "
                "Use this to add bullet points, summaries, or any content without replacing what exists."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "The unique ID of the note to append to."
                    },
                    "note_title": {
                        "type": "string",
                        "description": "The title of the note (for display in the approval card)."
                    },
                    "content": {
                        "type": "string",
                        "description": "The markdown content to append."
                    }
                },
                "required": ["note_id", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_note_title",
            "description": "Renames an existing note to a new title.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "The unique ID of the note."
                    },
                    "new_title": {
                        "type": "string",
                        "description": "The new title for the note."
                    }
                },
                "required": ["note_id", "new_title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_notes",
            "description": (
                "Searches the user's vault semantically to find notes relevant to a query. "
                "Returns a list of matching note IDs and titles. "
                "ALWAYS use this before append_to_note to find the correct note_id."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A natural language description of what to search for."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_note",
            "description": "Reads and returns the full markdown content of a specific note by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "The unique ID of the note."
                    }
                },
                "required": ["note_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_sub_note",
            "description": (
                "Creates a new note as a child (sub-page) of an existing note. "
                "Use this when the user wants to break down a topic into sub-topics."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "parent_id": {
                        "type": "string",
                        "description": "The unique ID of the parent note."
                    },
                    "title": {
                        "type": "string",
                        "description": "The title of the new sub-note."
                    },
                    "content": {
                        "type": "string",
                        "description": "The markdown content of the sub-note."
                    }
                },
                "required": ["parent_id", "title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "replace_note_content",
            "description": (
                "Replaces the ENTIRE content of an existing note. "
                "Use this to delete content or rewrite the page entirely."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "The unique ID of the note."
                    },
                    "content": {
                        "type": "string",
                        "description": "The new markdown content (can be empty to clear the page)."
                    }
                },
                "required": ["note_id", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_note",
            "description": "Deletes an existing note completely from the vault.",
            "parameters": {
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "The unique ID of the note to delete."
                    }
                },
                "required": ["note_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_all_notes",
            "description": "Retrieves a list of all notes in the vault, returning their IDs, titles, and tags. Use this when the user asks what notes they have or asks for an overview of their vault.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]
