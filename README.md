# LLaMA Playground 🦙
A simple web interface to run LLaMA on a web browser.

![LLaMA Playground](https://github.com/MohamedAliRashad/llama-playground/blob/master/assets/website.png)

## 👨‍🔧 How to use ?
1. Clone the repository
    ```bash
    git clone https://github.com/MohamedAliRashad/llama-playground.git
    ```
1. Download the LLaMA weights (There is different methods to do that, the easiest i found is this)
    ```bash
    pip install pyllama -U && python3 -m llama.download --model_size 7B --folder llama-playground/backend/app/weights
    ```
1. Add `.env` file to the root of the project with the ngrok auth token
    ```bash
    NGROK_AUTH= # Add your ngrok auth token here
    ```
1. Run the docker-compose file
    ```bash
    docker-compose up --build
    ```

**And that's it**, you can now access the playground on `http://localhost:4551` where you will find the ngrok links to try the playground and share it with your friends 👏
