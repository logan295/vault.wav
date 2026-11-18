"""Metadata only. No provider extension sync, audio download, or tag writes."""
import asyncio
import contextlib
import importlib.metadata
import json
import os
import sys

async def resolve(url):
    from mornye.extensions.manager import ExtensionManager
    if ExtensionManager(auto_install_downloads=False).get_installed("utilities") is None:
        raise RuntimeError("Utilities extension missing")
    from mornye import AsyncMornye
    async with AsyncMornye(output_dir="var/mornye/unused", sync_extensions=False,
                           registries=[], timeout_s=20) as client:
        info, tracks = await client.get_playlist(url)
        return {"name": str(info.get("name", "Imported music"))[:100],
                "tracks": [{"title": t.title, "artist": t.artists,
                            "durationSecs": t.duration_ms / 1000,
                            "url": t.external_url} for t in tracks[:500]],
                "truncated": len(tracks) > 500}

try:
    with contextlib.redirect_stdout(sys.stderr):
        if len(sys.argv) == 1:
            from mornye.extensions.manager import ExtensionManager
            installed = ExtensionManager(auto_install_downloads=False).get_installed("utilities") is not None
            result = {"ready": installed, "installed": True, "version": importlib.metadata.version("mornye"), "reason": "" if installed else "Mornye is installed. Spotify lookup requires the optional utilities.sflx extension from your Mornye provider."}
        else:
            result = asyncio.run(asyncio.wait_for(resolve(sys.argv[1]), timeout=35))
    print(json.dumps(result))
except Exception:
    # Provider exceptions may contain tokens or private service responses.
    print(json.dumps({"error": "Metadata lookup failed. Check the public Spotify link and try again; the provider may be unavailable."}))
    sys.exit(1)
