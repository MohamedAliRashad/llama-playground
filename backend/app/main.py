import json
import os
import time
from pathlib import Path
from typing import List

import torch
import uvicorn
from fairscale.nn.model_parallel.initialize import initialize_model_parallel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from torch.distributed.launcher.api import LaunchConfig, elastic_launch

from llama import LLaMA, ModelArgs, Tokenizer, Transformer


def sample_top_p(probs, p):
    probs_sort, probs_idx = torch.sort(probs, dim=-1, descending=True)
    probs_sum = torch.cumsum(probs_sort, dim=-1)
    mask = probs_sum - probs_sort > p
    probs_sort[mask] = 0.0
    probs_sort.div_(probs_sort.sum(dim=-1, keepdim=True))
    next_token = torch.multinomial(probs_sort, num_samples=1)
    next_token = torch.gather(probs_idx, -1, next_token)
    return next_token


def main(ckpt_dir: str, tokenizer_path: str) -> LLaMA:
    local_rank = int(os.environ.get("LOCAL_RANK", -1))
    world_size = int(os.environ.get("WORLD_SIZE", -1))

    torch.distributed.init_process_group("nccl")
    initialize_model_parallel(world_size)
    torch.cuda.set_device(local_rank)

    # seed must be the same in all processes
    torch.manual_seed(1)

    start_time = time.time()

    checkpoints = sorted(Path(ckpt_dir).glob("*.pth"))
    assert world_size == len(
        checkpoints
    ), f"Loading a checkpoint for MP={len(checkpoints)} but world size is {world_size}"
    ckpt_path = checkpoints[local_rank]
    print("Loading")

    checkpoint = torch.load(ckpt_path, map_location="cpu")
    with open(Path(ckpt_dir) / "params.json", "r") as f:
        params = json.loads(f.read())

    model_args: ModelArgs = ModelArgs(max_seq_len=2048, max_batch_size=1, **params)
    tokenizer = Tokenizer(model_path=tokenizer_path)
    model_args.vocab_size = tokenizer.n_words
    torch.set_default_tensor_type(torch.cuda.HalfTensor)
    model = Transformer(model_args)
    torch.set_default_tensor_type(torch.FloatTensor)
    model.load_state_dict(checkpoint, strict=False)
    print(f"Loaded in {time.time() - start_time:.2f} seconds")

    class ConnectionManager:
        def __init__(self):
            self.active_connections: List[WebSocket] = []

        async def connect(self, websocket: WebSocket):
            await websocket.accept()
            self.active_connections.append(websocket)

        def disconnect(self, websocket: WebSocket):
            self.active_connections.remove(websocket)

        async def send_personal_message(self, message: str, websocket: WebSocket):
            await websocket.send_text(message)

        async def broadcast(self, message: str):
            for connection in self.active_connections:
                await connection.send_text(message)

    manager = ConnectionManager()
    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    async def check_health():
        return {"status": "ok"}

    @app.websocket("/ws/{client_id}")
    async def websocket_endpoint(websocket: WebSocket, client_id: int):
        await manager.connect(websocket)

        temperature = float(os.environ.get("TEMPERATURE"))
        top_p = float(os.environ.get("TOP_P"))
        max_gen_len = int(os.environ.get("MAX_GEN_LEN"))
        max_seq_len = int(os.environ.get("MAX_SEQ_LEN"))
        print(f"temperature: {temperature}, top_p: {top_p}, max_gen_len: {max_gen_len}, max_seq_len: {max_seq_len}")

        try:
            while True:
                text = await websocket.receive_text()

                prompt_tokens = tokenizer.encode(text, bos=True, eos=False)
                min_prompt_size = max_prompt_size = len(prompt_tokens)
                total_len = min(max_seq_len, max_gen_len + max_prompt_size)
                tokens = torch.full((1, total_len), tokenizer.pad_id).cuda().long()
                tokens[0, : len(prompt_tokens)] = torch.tensor(prompt_tokens).long()
                input_text_mask = tokens != tokenizer.pad_id
                start_pos = min_prompt_size
                prev_pos = 0
                token_stack = tokens[0, prev_pos:start_pos].tolist()
                for cur_pos in range(start_pos, total_len):
                    logits = model.forward(tokens[:, prev_pos:cur_pos], prev_pos)
                    if temperature > 0:
                        probs = torch.softmax(logits / temperature, dim=-1)
                        next_token = sample_top_p(probs, top_p)
                    else:
                        next_token = torch.argmax(logits, dim=-1)
                    next_token = next_token.reshape(-1)
                    if next_token.item() != tokenizer.eos_id:
                        token_stack.append(next_token.item())
                        output = tokenizer.decode(token_stack)
                        await manager.send_personal_message(output, websocket)

                    # only replace token if prompt has already been generated
                    next_token = torch.where(input_text_mask[:, cur_pos], tokens[:, cur_pos], next_token)
                    tokens[:, cur_pos] = next_token
                    prev_pos = cur_pos

        except WebSocketDisconnect:
            manager.disconnect(websocket)
            # await manager.broadcast(f"Client #{client_id} left the chat")
            print(f"Client #{client_id} left the chat")

    uvicorn.run(app, host="0.0.0.0", port=8040)


if __name__ == "__main__":
    config = LaunchConfig(min_nodes=1, max_nodes=1, nproc_per_node=1, rdzv_endpoint="localhost:0", rdzv_backend="c10d")
    generator = elastic_launch(config, main)(str(Path(__file__).parent / "weights/7B"), str(Path(__file__).parent / "weights/tokenizer.model"))
