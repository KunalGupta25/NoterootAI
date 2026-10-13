from pydantic import BaseModel, Field


class PluginPublishRequest(BaseModel):
    plugin_id: str = Field(alias="pluginId", min_length=1)
    name: str = Field(min_length=1)
    author: str = Field(min_length=1)
    description: str = ""
    version: str = Field(min_length=1)
    github_url: str | None = Field(default=None, alias="githubUrl")
    readme: str = Field(min_length=1)
    code: str = Field(min_length=1)

    model_config = {"populate_by_name": True}
