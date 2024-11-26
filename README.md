# Program Repair Project

Utilizing Large Language Models to preair a dataset and use it to train a model to repair code. This particular `ts` package generates solutions for coding problems from the `LiveCodeBench` dataset via some small model, then, stress tests solutions using data provided in the dataset and in case of incorrect behavior -- tries to fix solutions using the execution feedback and a bigger model. Via this procedure a dataset is created. 

Authors: *Nikita Khramov*, *Andrei Kozyrev* and *Ivan Kabashnyi*

ML4SE, Constructor University, Bremen, Autumn 2024

## Prerequisites

Setup the npm version via `nvm`:
```bash
nvm use
```

Install dependencies:
```bash
npm install
```

Download `LiveCodeBench` (`test4.jsonl`) from [here](https://huggingface.co/datasets/livecodebench/code_generation_lite/tree/main)

## Development

Run the entry point:
```bash
npm run serve
```

Run tests:
```bash
npm test
```
