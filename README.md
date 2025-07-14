# FireRouter

This is sort of a gimmick local reverse proxy for use with chat completion APIs. It consumes
different apis (currently only OpenAI-likes, OpenRouter and Gemini) and exposes a
common OpenAI-like API (with streaming support!).

Look at this SillyTavern Custom OpenAI configuration and the Available Models list:

![dropdown](https://files.catbox.moe/cd6g4c.png)

The URL points to my local firerouter instance. It offers ST two models.
GPT 4.1 in its raw form, and GPT 4.1 with temperature 2. How does it do this?

First, the `modelsProvider` in the `config.yaml` looks like this:

```yaml
modelProviders:
  or:
    type: "genericoai"
    url: "https://openrouter.ai/api/v1"
    keyProvider: "myORKey"
    models:
      gpt-4.1-raw:
        name: "openai/gpt-4.1"
      gpt-4.1-with-temp-2:
        name: "openai/gpt-4.1"
        processor: setTempTo2
```

As you can see, the names used here are what's exposed on the other end to ST.
In terms of configuration proper, they're both just OpenRouter GPT 4.1, except
the latter has a `processor`.

A processor is a thing that alters a request before it's sent.

This is what `setTempTo2` looks like in the `config.yaml`:

```yaml
processors:
  setTempTo2:
    type: "overridesamplers"
    temperature: 2
```

"overridesamplers" does what it sounds like it does. You can run multiple
processors randomly or in order, and you won't be stopped from doing
something stupid like overriding temp 5 times before settling on a number
you like, or lying about what your processors do in their names.

Finally, you configure your keys by defining keyProviders. Like this:

```yaml
keyProviders:
  myORKey:
    type: "literal"
    key: "sk-or-v1-your-actual-key-here-lol"
```

You can also just inline your keyProvider and your processors instead of
defining them on the top level and then invoking them by their names.

Like this:

```yaml
modelProviders:
  or:
    type: "genericoai"
    url: "https://openrouter.ai/api/v1"
    keyProvider:
      type: "literal"
      key: "sk-or-v1-your-actual-key-here-lol"
    models:
      gpt-4.1-raw:
        name: "openai/gpt-4.1"
      gpt-4.1-with-temp-2:
        name: "openai/gpt-4.1"
        processor:
          - type: "whitespace" # cleans up most whitespace; breaks ASCII and code
          - type: "overridesamplers"
            temperature: 2
```

And, as you can also notice above, your model's `processor` (or your top level processor)
can be an array of `ProcessorConfiguration`! (This is a shorthand syntax for creating
ChainProcessors. Feel free to use the normal form if YAML object arrays scare you).

## Randomization

Consider now:

```yaml
modelProviders:
  or:
    type: "genericoai"
    url: "https://openrouter.ai/api/v1"
    keyProvider:
      type: "literal"
      key: "sk-or-v1-your-actual-key-here-lol"
      models: 
        gpt-4.1:
          name: "openai/gpt-4.1"
        qwen-3-32b:
          name: "qwen/qwen3-32b"

  random:
    type: "random"
    modelList: # models are weighted equally if you use a modelList
      - or/gpt-4.1
      - or/qwen-3-32b

  random-2:
    type: "random"
    modelWeights: # or you can assign arbitrary positive weights!
      "or/gpt-4.1": 0.4
      "or/qwen-3-32b": 0.6
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

Make sure to copy `config.example.yaml` into `config.yaml` and fill out your configuration.

Remember to rebuild after git pulling!

## Auth

There's no auth. There will be no auth. This isn't fit for anything
other than strictly local deployments. It will remain like this.

## Configuration

## Top-Level Configuration

This is the main configuration object for the entire application.

| Property            | Type                                       | Default       | Description                                                                                                                               |
|---------------------|--------------------------------------------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `port`              | `number`                                   | `3000`        | The port number on which the server will listen.                                                                                          |
| `keyProviders`      | `Map<string, KeyProviderConfiguration>`    | `(empty map)`  | A map of named key providers. The key is a unique name you choose, and the value is the provider's configuration object.                  |
| `modelProviders`    | `Map<string, ModelProviderConfiguration>`  | (Required)    | A map of named model providers. The key is a unique name you choose (e.g., "gpt-4-turbo"), and the value is the provider's configuration. |
| `processors`        | `Map<string, ProcessorConfiguration>` | `(empty map)` | A map of named processor chains. The key is a unique name, and the value is an array of processor configurations.                         |
| `streamingInterval` | `number`                                    | `0`           | Forces every character in the stream to wait for `streamingInterval` to flush to the client.                                              |

---

## Key Providers

### Environment Key Provider

Loads an API key from a system environment variable.

**`type: "environment"`**

| Property       | Type       | Required | Description                                                                            |
| -------------- | ---------- | -------- |----------------------------------------------------------------------------------------|
| `type`         | `string`   | Yes      | Must be `"environment"`.                                                               |
| `envVar`       | `string`   | Yes      | The name of the environment variable to read the key from.                             |

### Literal Key Provider

Uses a key that is directly embedded in the configuration file.

**`type: "literal"`**

| Property       | Type       | Required | Description                                                                 |
| -------------- | ---------- | -------- | --------------------------------------------------------------------------- |
| `type`         | `string`   | Yes      | Must be `"literal"`.                                                        |
| `key`          | `string`   | Yes      | The actual API key string.                                                  |

---

## Model Configuration

| Property    | Type                              | Required | Description                                                                                                             |
|-------------|-----------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------|
| `name`       | `string`                          | Yes      | The model name on the API firerouter is consuming (like OpenRouter).                                                    |
| `processor` | `string` or ProcessorConfiguration | No       | The name of a `processor` (defined in the top-level `processors` map) or a ProcessorConfiguration to apply to requests. |


## Model Providers

### Base Properties

| Property         | Type                                                          | Required | Description                                                                                                             |
| ---------------- |---------------------------------------------------------------| -------- |-------------------------------------------------------------------------------------------------------------------------|
| `keyProvider` | `string` or `KeyProviderConfiguration` | (Required)                  | A key provider, either named or inline. MUST be present even if the provider requires no keys.                          |

### Generic OpenAI-Compatible Provider

Use this for any service that exposes an OpenAI-compatible API, such as OpenAI itself, local engines like `llamacpp`,
or other compatible services.

**`type: "genericoai"`**

| Property             | Type                              | Default                     | Description                                        |
|----------------------|-----------------------------------|-----------------------------|----------------------------------------------------|
| `type`               | `string`                          | (Required)                  | Must be `"genericoai"`.                            |
| `url`                | `string`                          | `https://api.openai.com/v1` | The API URL up to /v1                              |
| `models`             | `Map<string, ModelConfiguration>` | (Required)                  | The models to load under this provider.            |
| `addMistralPrefix`   | `boolean`                         | False                       | Adds the mistral `prefix` field to your prefill.   |
| `addMoonshotPartial` | `boolean`                         | False                       | Adds the moonshot `partial` field to your prefill. |


### Gemini Provider

A dedicated provider for connecting to Google's Gemini models.

**`type: "gemini"`**

| Property    | Type     | Default                                                    | Description                                               |
| ----------- | -------- | ---------------------------------------------------------- |-----------------------------------------------------------|
| `type`      | `string` | (Required)                                                 | Must be `"gemini"`.                                       |
| `url`       | `string` | `https://generativelanguage.googleapis.com/v1beta/models`  | The base URL for the Gemini API.                          |
| `models` | `Map<string, ModelConfiguration>` | (Required)                                   | The models to load under this provider. |

### Random Model Provider

A meta-provider that randomly selects one of its configured models for each request, optionally using weights.

Requires a `keyProvider`, even though it won't be used. Just give a fake made up
key to love and cherish.

**`type: "random"`**

| Property       | Type                  | Required | Description                                                                                                                                                               |
| -------------- | --------------------- | -------- |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `type`         | `string`              | Yes      | Must be `"random"`.                                                                                                                                                       |
| `modelList`    | `string[]`            | No       | A list of model provider names to choose from uniformly. Either use this or modelWeights.                                                                                 |
| `modelWeights` | `Map<string, number>` | No       | A map where keys are model provider names and values are their selection weights. Higher weights are more likely to be chosen. Overrides `modelList` if both are present. |

### Trivial Model Provider

A simple provider for testing and debugging. It responds with a fixed, pre-defined sentence.

Requires a `keyProvider`, even though it won't be used. Just give a fake made up
key to love and cherish.

**`type: "trivial"`**

| Property | Type     | Default                                                | Description                                   |
| -------- | -------- |--------------------------------------------------------| --------------------------------------------- |
| `type`   | `string` | (Required)                                             | Must be `"trivial"`.                          |
| `output` | `string` | `Yahallo! Some extra padding to make this longer lol.` | The static string to return in every response. |

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

### Whitespace Processor

Does common sense whitespace processing on prompts.

Specifically, for every segment involving two or more sequential whitespace characters:
- if it contains two newlines, the segment is converted into just the two newlines
- if it contains a newline, the segment is converted into just the newline
- if it contains no newlines, it becomes a single space

Obviously breaks code formatting and ASCII, but solid for generic RPing.

**`type: "whitespace"`**

| Property   | Type     | Required | Description                                                                                |
| ---------- | -------- | -------- |--------------------------------------------------------------------------------------------|
| `type`     | `string` | Yes      | Must be `"whitespace"`.                                                                    |


### Chain Processor

A meta-processor that runs multiple processors in sequence as a single processor unit.

Intended for usage with the `random` processor. If you're not using `random`, this will just
clutter your `config.yaml`.

**`type: "chain"`**

| Property     | Type                         | Required | Description                                               |
| ------------ | ---------------------------- | -------- | --------------------------------------------------------- |
| `type`       | `string`                     | Yes      | Must be `"chain"`.                                        |
| `processors` | `ProcessorConfiguration[]`   | Yes      | An array of processor configurations to run in sequence.  |

