# FireRouter

This is sort of a gimmick local reverse proxy for use with chat completion APIs. It consumes
different apis (currently only other OpenAI-likes and OpenRouter) and exposes an OpenAI-like API.

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

So they're both just OpenRouter GPT 4.1, except the latter has a `processorChain`.

A processor chain is just a sequence of request processors that alter it before it's sent.

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
about what your processors do.

Finally, you configure your keys by distributing keyProviders between models. Like this:

```yaml
keyProviders:
  myORKey:
    type: "literal"
    key: "sk-or-v1-your-actual-key-here-lol"
    modelTargets:
      - ".*"
```

The `modelTargets` field is a regex you use to filter out models you've configured and assign
them keys. For example, `openrouter` will assign the key to every model with "openrouter" in
its name. ".*" assigns your key to every model (if, for example, you already only use openrouter).

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
    modelList:
      - gpt-4.1
      - qwen-3-32b
  random-2:
    type: "random"
    modelWeights:
      "gpt-4.1": 0.4
      "qwen-3-32b": 0.6
```

The `random` provider type is basically the true reason this project exists: it allows for random
routing between your previously configured models.

So, for example, you can randomly distribute requests between GPT-4.1 and ChatGPT-4o-Latest,
to try and increase your response variety, or between something like Claude Opus 4 and
Claude Sonnet 4, to lower your average request costs, or even between multiple variations
of the same model, with different processor chains!

## Configuration

See the config.example.yaml for details.

## Running

Git clone the project normally (like you did ST), install deps with `npm i`,
build with `npm run build` and run with `npm run start`.

Remember to rebuild after git pulling!

