# Flow

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/justiceo/flow/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/justiceo/flow/tree/main)

A simple API that enhances your LLM integration with automated logging, jest-like testing, on-demand evals, with meaningful and sliceable analytics.

## High-level architecture

- While in 'flow', collect logs in a buffer.
- After the flow, process the logs to create a logEntry.
- The logEntry may be saved to a log file or handle by other transports.
- Transports could be google analytics, console, sentry, or returning to json (for tests).

## Development

- Install [Prettier VS Code](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) for auto format-on-save.
- Alternatively, execute `npm run format` to format files before submission.

## Target LLM Providers

- OpenAI
- Anthropic
- AWS Bedrock
- Gemini
- Cohere
- LangChain
- Together AI
- Mistral

## Target Observability Platforms

- DataDog
- Dynatrace
- Splunk
- Google Analytics
- New Relic
- Grafana
- Honecomb

## Alternative LLM Observability Tools

- Langfuse - https://github.com/langfuse/langfuse, https://langfuse.com/docs/get-started
- Evidently AI - https://github.com/evidentlyai/evidently, https://www.evidentlyai.com/
- Pheonix - https://github.com/Arize-ai/phoenix, https://docs.arize.com/phoenix
- OpenLLmetry - https://github.com/traceloop/openllmetry, https://www.traceloop.com/openllmetry
- Helicone - https://github.com/Helicone/helicone, https://www.helicone.ai/
- Lunary - https://github.com/lunary-ai/lunary, https://lunary.ai/

## TODOs

- Latency measurement
- Eval tool
