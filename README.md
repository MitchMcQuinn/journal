# n8n-form-demo

Static, multi-step form demo that delegates flow control to n8n.

## Structure

- `form flows/` contains individual flows.
- Each flow folder has its own `config.json`, HTML pages, and `flow.css`.
- `styles.css` is the universal stylesheet applied to all flows.
- `app.js` handles API calls, state, and routing between steps.
- `route.js` handles friendly route redirects like `/demo`.
- `routes.json` maps friendly routes to flow configs.

## Configure n8n endpoints

Update the single `initialization.webhook_url` in each flow `config.json` to
match your n8n flow. The frontend expects every webhook response to return:
expects every webhook response to return:

```
{
  "next_step": "<string>",
  "variables": {
    "...": "..."
  }
}
```

You can optionally send extra variables with each request by adding
`request_variables` to the initialization block in `config.json`, or by adding
`data-request-variables` on a specific form or button. These are merged into the
`variables` payload sent to n8n so you can branch in a single workflow.
Step-specific variables should be set on the form or button via
`data-request-variables`.

You can also set a `data-next-step-fallback` on a form or button to override
the config fallback when no `next_step` is returned by n8n.

To customize the waiting indicator, add `data-waiting-message` to a form or
button. Button text takes priority over form text.

## Local usage

Run the dev server with a single command:

```
./run forms
```

Then open `http://localhost:8080/`. Friendly routes like `/demo` will work
automatically.

Pretty URLs are supported automatically: any `-` in a path maps to a space on
disk. For example, `/form-flows/Demo-form/results.html` resolves to
`/form flows/Demo form/results.html`.

To add a friendly route, set `route` in the flow config and add it to
`routes.json` (route → config path). For direct `/demo` navigation you need a
static server that falls back to `index.html` for unknown routes (ex: `npx serve -s .`).


## Example of calling workflows from the CLI
cd /Users/mitchie/Documents/Journal/journal && curl -sS -X POST -H 'Content-Type: application/json' -d '{"variables":{"flow":"i-ching-journal","step":"manual-entry"},"form":{"primary_upper_trigram":"Heaven","primary_lower_trigram":"Heaven","resulting_upper_trigram":"Lake","resulting_lower_trigram":"Lake"}}' https://n8n.mitchiecraft.com/webhook/b12267d5-dded-437b-9d92-345d09a5992f    