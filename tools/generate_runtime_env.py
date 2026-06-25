from __future__ import annotations

import json
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
OUTPUT_PATH = ROOT_DIR / "shared" / "js" / "runtime-env.js"

DEFAULTS = {
    "DAYZ_MAP_ASSISTANT_ENABLED": "false",
}


def parse_env_file(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    if not path.exists():
        return result

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]

        result[key] = value

    return result


def main() -> None:
    env_values = DEFAULTS.copy()
    env_values.update(parse_env_file(ENV_PATH))
    runtime_env = {key: str(env_values.get(key, "")) for key in DEFAULTS}

    content = "window.DayzMapRuntimeEnv = " + json.dumps(runtime_env, ensure_ascii=True, indent=4) + ";\n"
    OUTPUT_PATH.write_text(content, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
