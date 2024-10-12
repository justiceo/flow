# Flow

A simple API that enhances your LLM integration with automated logging, jest-like testing, on-demand evals, with meaningful and sliceable analytics.

## High-level architecture

* While in 'flow', collect logs in a buffer.
* After the flow, process the logs to create a logEntry.
* The logEntry may be saved to a log file or handle by other transports.
* Transports could be google analytics, console, sentry, or returning to json (for tests).

### LogEntry Schema

- request_prompt
- request_messages
- request_system_prompt
- request_model_id
- request_model_family
- request_temperature
- request_topK
- request_function_calls
- request_max_tokens
- request_start_time
- request_sent_time
- request_token_count
- request_error_reason
- request_id
- response_text
- response_status
- response_error_reason
- response_token_count
- response_start_time
- response_end_time
- function_calls []
- function_call_args
- function_call_result
- function_call_exit_code
- function_call_start_time
- function_call_end_time
- session_id
- total_token_count
- input_token_cost_1k
- output_token_cost_1k
- trigger_source
- output_mode [streaming, schema]
- user_id
- country
- operating_system
- shell
- user_time_zone