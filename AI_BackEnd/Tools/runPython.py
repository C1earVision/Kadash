from langchain.tools import tool
from dotenv import load_dotenv
import os
import subprocess
import uuid
import os
import base64
import os
import uuid
import subprocess




class runPython:
    def __init__(self):
        load_dotenv()
        self.runPythonToolList = self.setup_tool()


    def setup_tool(self):
        @tool
        def run_python(code: str) -> str:
            """Run generated Python code inside Docker for visualization/analysis and return a download link."""
            print("python docker tool used")
            
            # Generate unique job ID and temp folder
            job_id = str(uuid.uuid4())
            temp_dir = os.path.abspath(f"./tmp/{job_id}")
            os.makedirs(temp_dir, exist_ok=True)

            # File paths
            script_path = os.path.join(temp_dir, "script.py")
            output_path = os.path.join(temp_dir, "output.png")

            # Save Python code to script.py
            with open(script_path, "w") as f:
                f.write(code)  # ensure plt.savefig uses raw string path

            # Run code inside Docker
            docker_cmd = [
                "docker", "run", "--rm",
                "-v", f"{temp_dir}:/app",
                "-w", "/app",
                "sandbox-python",
                "python3", "script.py"
            ]

            try:
                subprocess.run(docker_cmd, check=True, timeout=10)

                # Construct the URL accessible via FastAPI static route
                download_url = f"http://127.0.0.1:9000/static/{job_id}/output.png"

                print("Image generated and saved. URL:", download_url)
                return f"Here is your visualization download link: {download_url}"

            except subprocess.CalledProcessError as e:
                return f"Error: Execution error: {e}"
            except subprocess.TimeoutExpired:
                return "Error: Execution timed out"


        return [run_python]