import asyncio
from providers.openai_provider import OpenAIProvider

async def test():
    p = OpenAIProvider(base_url='https://integrate.api.nvidia.com/v1', api_key='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', provider_name='nvidia')
    try:
        response = await p.client.chat.completions.create(
            model='qwen/qwen3.5-122b-a10b',
            messages=[{'role':'user', 'content':'hi'}],
            tools=[],
            stream=True
        )
        print("Got response object:", response)
        async for chunk in response:
            print("CHUNK:", chunk)
    except Exception as e:
        print(f"Exception: {e}")

asyncio.run(test())
