# FireRouter

This is sort of a gimmick local reverse proxy for use with chat completion APIs. It consumes
different apis (currently only OpenAI-likes, OpenRouter and Gemini) and exposes a
common OpenAI-like API (with streaming support!).

Look at this SillyTavern Custom OpenAI configuration and the Available Models list:

![dropdown](https://files.catbox.moe/46b9az.png)

The URL points to my local firerouter instance. It offers ST two models.
GPT 4.1 in its raw form, and GPT 4.1 with temperature 2. How does it do this?

First, the `modelsProvider` in the `config.yaml` looks like this:

```yaml
modelProviders:
  gpt-4.1-raw:
    type: "openrouter"
    modelName: "openai/gpt-4.1"
  gpt-4-1-with-temp-2:
    type: "openrouter"
    modelName: "openai/gpt-4.1"
    processorChain: myCustomChainThatSetsTempTo2
```

As you can see, the names used here are what's exposed on the other end to ST.
In terms of configuration proper, they're both just OpenRouter GPT 4.1, except
the latter has a `processorChain`.

A processor chain is just a sequence of processors that alter a request before it's sent.

This is what `myCustomChainThatSetsTempTo2` looks like in the `config.yaml`:

```yaml
processorChains:
  myCustomChainThatSetsTempTo2:
    - type: "overridesamplers"
      temperature: 2
    - type: "nosys"
```

"overridesamplers" does what it sounds like it does. "nosys" changes all system messages to
user role. These processors are guaranteed to run in order, and you won't be stopped from doing
something stupid like overriding temp 5 times before settling on a number you like, or lying
about what your processors do in their names.

Finally, you configure your keys by distributing keyProviders between models. Like this:

```yaml
keyProviders:
  myORKey:
    type: "literal"
    key: "sk-or-v1-your-actual-key-here-lol"
    modelTargets:
      - "^gpt"
```

The `modelTargets` field is a regex you use to filter out models you've configured and assign
them keys. "^gpt" in this case means "every model with a name that starts with gpt."
For another example, just `openrouter` will assign the key to every model with "openrouter" in
its name. `.*` assigns your key to every model (very useful if, for example, you already only
use openrouter).

## Randomization

Consider now:

```yaml
modelProviders:
  gpt-4.1:
    type: "openrouter"
    modelName: "openai/gpt-4.1"
  qwen-3-32b:
    type: "openrouter"
    modelName: "qwen/qwen3-32b"
  random:
    type: "random"
    modelList: # models are weighted equally if you use a modelList
      - gpt-4.1
      - qwen-3-32b
  random-2:
    type: "random"
    modelWeights: # or you can assign arbitrary positive weights!
      "gpt-4.1": 0.4
      "qwen-3-32b": 0.6
```

The `random` provider type is basically the true reason this project exists: it allows for random
routing between your previously configured models.

So, for example, you can randomly distribute requests between GPT-4.1 and ChatGPT-4o-Latest,
to try and increase your response variety, or between something like Claude Opus 4 and
Claude Sonnet 4, to lower your average request costs, or even between multiple variations
of the same model, with different processor chains!

There is similarly a `random` processor you can use to
more easily specifically randomize your processor chains.

## Running

Git clone the project normally (like you did ST), install deps with `npm i`,
build with `npm run build` and run with `npm run start`. Server listens by default
on `http://127.0.0.1:3000/v1`.

Remember to rebuild after git pulling!

## Auth

There's no auth. There will be no auth. This isn't fit for anything
other than strictly local deployments. It will remain like this.

## Configuration

## Top-Level Configuration

This is the main configuration object for the entire application.

| Property          | Type                                         | Default       | Description                                                                                                                               |
| ----------------- |----------------------------------------------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `port`            | `number`                                     | `3000`        | The port number on which the server will listen.                                                                                          |
| `keyProviders`    | `Map<string, KeyProviderConfiguration>`      | (Required)    | A map of named key providers. The key is a unique name you choose, and the value is the provider's configuration object.                  |
| `modelProviders`  | `Map<string, ModelProviderConfiguration>`    | (Required)    | A map of named model providers. The key is a unique name you choose (e.g., "gpt-4-turbo"), and the value is the provider's configuration. |
| `processorChains` | `Map<string, ProcessorChainConfiguration>`   | `(empty map)` | A map of named processor chains. The key is a unique name, and the value is an array of processor configurations.                         |

---

## Key Providers

### Environment Key Provider

Loads an API key from a system environment variable.

**`type: "environment"`**

| Property       | Type       | Required | Description                                                                            |
| -------------- | ---------- | -------- |----------------------------------------------------------------------------------------|
| `type`         | `string`   | Yes      | Must be `"environment"`.                                                               |
| `modelTargets` | `string[]` | Yes      | A list of regexes that filter the models in `modelProviders` that this key applies to. |
| `envVar`       | `string`   | Yes      | The name of the environment variable to read the key from.                             |

### Literal Key Provider

Uses a key that is directly embedded in the configuration file.

**`type: "literal"`**

| Property       | Type       | Required | Description                                                                 |
| -------------- | ---------- | -------- | --------------------------------------------------------------------------- |
| `type`         | `string`   | Yes      | Must be `"literal"`.                                                        |
| `modelTargets` | `string[]` | Yes      | A list of regexes that filter the models in `modelProviders` that this key applies to. |
| `key`          | `string`   | Yes      | The actual API key string.                                                  |

---

## Model Providers

### Base Properties

| Property         | Type     | Required | Description                                                                                           |
| ---------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `processorChain` | `string` | No       | The name of a `processorChain` (defined in the top-level `processorChains` map) to apply to requests. |

### Generic OpenAI-Compatible Provider

Use this for any service that exposes an OpenAI-compatible API, such as OpenAI itself, local engines like `llamacpp`,
or other compatible services.

**`type: "genericoai"`**

| Property    | Type     | Default                                      | Description                                                |
| ----------- | -------- |----------------------------------------------|------------------------------------------------------------|
| `type`      | `string` | (Required)                                   | Must be `"genericoai"`.                                    |
| `url`       | `string` | `https://api.openai.com/v1/chat/completions` | The full URL to the chat completions endpoint.             |
| `modelName` | `string` | (Required)                                   | The name of the model to use (e.g., `gpt-4-1106-preview`). |

### OpenRouter Provider

A dedicated provider for connecting to [OpenRouter](https://openrouter.ai/).

**`type: "openrouter"`**

| Property    | Type     | Required | Description                                               |
| ----------- | -------- | -------- |-----------------------------------------------------------|
| `type`      | `string` | Yes      | Must be `"openrouter"`.                                   |
| `modelName` | `string` | Yes      | The OpenRouter model name (e.g., `mistralai/mistral-7b`). |

### Gemini Provider

A dedicated provider for connecting to Google's Gemini models.

**`type: "gemini"`**

| Property    | Type     | Default                                                    | Description                                               |
| ----------- | -------- | ---------------------------------------------------------- |-----------------------------------------------------------|
| `type`      | `string` | (Required)                                                 | Must be `"gemini"`.                                       |
| `url`       | `string` | `https://generativelanguage.googleapis.com/v1beta/models`  | The base URL for the Gemini API.                          |
| `modelName` | `string` | (Required)                                                 | The name of the Gemini model to use (e.g., `gemini-pro`). |

### Random Model Provider

A meta-provider that randomly selects one of its configured models for each request, optionally using weights.

**`type: "random"`**

| Property       | Type                  | Required | Description                                                                                                                                                               |
| -------------- | --------------------- | -------- |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`         | `string`              | Yes      | Must be `"random"`.                                                                                                                                                       |
| `modelList`    | `string[]`            | No       | A list of model provider names to choose from uniformly. Either use this or modelWeights.                                                                                 |
| `modelWeights` | `Map<string, number>` | No       | A map where keys are model provider names and values are their selection weights. Higher weights are more likely to be chosen. Overrides `modelList` if both are present. |

### Trivial Model Provider

A simple provider for testing and debugging. It responds with a fixed, pre-defined sentence.

**`type: "trivial"`**

| Property | Type     | Default                                              | Description                                   |
| -------- | -------- |------------------------------------------------------| --------------------------------------------- |
| `type`   | `string` | (Required)                                           | Must be `"trivial"`.                          |
| `output` | `string` | `Yahallo! Some extra padding to make this longer...` | The static string to return in every response. |

---

## Processor Chains

### No Dangling System Messages Processor

Ensures that once a non-system message appears in the chat history, all subsequent system messages are converted
to the `user` role.

**`type: "nodanglingsys"`**

| Property | Type     | Required | Description                |
| -------- | -------- | -------- |----------------------------|
| `type`   | `string` | Yes      | Must be `"nodanglingsys"`. |

### No System Messages Processor

A simple processor that transforms every system message into a user message.

**`type: "nosys"`**

| Property | Type     | Required | Description        |
| -------- | -------- | -------- | ------------------ |
| `type`   | `string` | Yes      | Must be `"nosys"`. |

### Override Samplers Processor

Overrides or unsets sampler parameters (like temperature, top_p, etc.) for a request. To remove a sampler
that was sent by the client, set its value to `"unset"`.

**`type: "overridesamplers"`**

| Property            | Type                          | Required | Description                                                |
| ------------------- | ----------------------------- | -------- | ---------------------------------------------------------- |
| `type`              | `string`                      | Yes      | Must be `"overridesamplers"`.                              |
| `temperature`       | `number \| "unset"`           | No       | The temperature value to set or `"unset"` to remove.       |
| `topP`              | `number \| "unset"`           | No       | The top_p value to set or `"unset"` to remove.             |
| `topK`              | `number \| "unset"`           | No       | The top_k value to set or `"unset"` to remove.             |
| `topA`              | `number \| "unset"`           | No       | The top_a value to set or `"unset"` to remove.             |
| `minP`              | `number \| "unset"`           | No       | The min_p value to set or `"unset"` to remove.             |
| `frequencyPenalty`  | `number \| "unset"`           | No       | The frequency_penalty value to set or `"unset"` to remove. |
| `repetitionPenalty` | `number \| "unset"`           | No       | The repetition_penalty value to set or `"unset"` to remove. |
| `presencePenalty`   | `number \| "unset"`           | No       | The presence_penalty value to set or `"unset"` to remove.  |

### Regex Processor

Applies a regular expression find-and-replace operation on the content of every message in the request.

**`type: "regex"`**

| Property      | Type     | Required | Description                                                      |
| ------------- | -------- | -------- |------------------------------------------------------------------|
| `type`        | `string` | Yes      | Must be `"regex"`.                                               |
| `pattern`     | `string` | Yes      | The regular expression pattern to search for (do not wrap in /). |
| `flags`       | `string` | No       | Regex flags (e.g., "g" for global, "i" for case-insensitive).    |
| `replacement` | `string` | Yes      | The string to replace the matched pattern with.                  |

### Random Processor

A meta-processor that randomly selects one processor from a list to execute.

**`type: "random"`**

| Property           | Type                                                   | Required | Description                                                                                                                                                               |
|--------------------|--------------------------------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`             | `string`                                               | Yes      | Must be `"random"`.                                                                                                                                                       |
| `processorList`    | `ProcessorConfiguration[]`                             | No       | An array of processor configurations to choose from randomly with equal weights. Either use this or `processorWeights`.                                                   |
| `processorWeights` | `{ weight: number, config: ProcessorConfiguration }[]` | No       | An array of objects with `weight` (number) and `config` (ProcessorConfiguration) properties for weighted random selection. Overrides `processorList` if both are present. |


`processorWeights` usage example:

```yaml
type: random
processorWeights:
  - weight: 2
    config:
      type: nosys
  - weight: 3
    config:
      type: nodanglingsys
```

### No Assistant Messages Processor

Converts all messages following the first assistant message to either user or assistant role
(based on configuration).

Does not guarantee equivalent behavior to the proper noass extension. But in principle, if
a preset has no assistant prompts, and the card has a greeting, the first assistant message
should act as a marker for the beginning of the chat history, and then we have regular noass
behavior.

**`type: "noass"`**

| Property | Type     | Required | Description                                                           |
| -------- | -------- | -------- |-----------------------------------------------------------------------|
| `type`   | `string` | Yes      | Must be `"noass"`.                                                    |
| `role`   | `string` | Yes      | The role to convert assistant messages to: `"user"` or `"assistant"`. |

### Squash Messages Processor

Combines consecutive messages of the same role(s) into a single message, joining their content with a specified string.

**`type: "squash"`**

| Property      | Type       | Default    | Description                                                                   |
| ------------- | ---------- |------------|-------------------------------------------------------------------------------|
| `type`        | `string`   | (Required) | Must be `"squash"`.                                                           |
| `squashString`| `string`   | `"\n\n"`   | The string used to join the content of consecutive messages.                  |
| `roles`       | `string[]` | (Required) | Array of roles to squash: `"user"`, `"assistant"`, `"system"`, `"developer"`. |

### Insert Message Processor

Inserts a new message at a specified position in the message array.

**`type: "insertmessage"`**

| Property   | Type     | Required | Description                                                                                |
| ---------- | -------- | -------- |--------------------------------------------------------------------------------------------|
| `type`     | `string` | Yes      | Must be `"insertmessage"`.                                                                 |
| `role`     | `string` | Yes      | The role of the inserted message: `"user"`, `"assistant"`, `"system"`, or `"developer"`.   |
| `content`  | `string` | Yes      | The content of the message to insert.                                                      |
| `position` | `number` | Yes      | The position to insert the message at (negative positions work, uses normal splice logic). |

### Chain Processor

A meta-processor that runs multiple processors in sequence as a single processor unit.

Intended for usage with the `random` processor. If you're not using `random`, this will just
clutter your `config.yaml`.

**`type: "chain"`**

| Property     | Type                         | Required | Description                                               |
| ------------ | ---------------------------- | -------- | --------------------------------------------------------- |
| `type`       | `string`                     | Yes      | Must be `"chain"`.                                        |
| `processors` | `ProcessorConfiguration[]`   | Yes      | An array of processor configurations to run in sequence.  |


---

## Example Configuration (YAML)

```yaml
# config.yaml

port: 3000

keyProviders:
  oai-key:
    type: environment
    modelTargets:
      - furbo
    envVar: MY_OAI_KEY
  or-key:
    type: literal
    modelTargets:
      - mistral

modelProviders:
  furbo:
    type: genericoai
    modelName: gpt-4-1106-preview
    processorChain: strict-chat
    
  mistral-7b:
    type: openrouter
    modelName: mistralai/mistral-7b

  random-picker:
    type: random
    modelWeights:
      gpt-4-turbo: 1 # Lower weight, less likely
      mistral-7b: 3  # Higher weight, more likely

processorChains:
  # A chain to enforce strict chat formatting and sampling
  strict-chat:
    # First, convert all system messages to user messages
    - type: nosys
    # Then, override any client-sent samplers with these fixed values
    - type: overridesamplers
      temperature: 0.7
      topP: 0.9
      # Explicitly remove topK if the client sends it
      topK: "unset"
```

