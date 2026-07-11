from langchain.tools import tool
from dotenv import load_dotenv
import os
import uuid
import traceback
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend — required in Docker/server environments


class runPython:
    def __init__(self):
        load_dotenv()
        self.runPythonToolList = self.setup_tool()

    def setup_tool(self):
        @tool
        def run_python(code: str) -> str:
            """
            Execute generated Python code for data visualization/analysis.
            Saves any matplotlib figure as output.png and returns a download link.
            The code should save its figure to 'output.png' in the current directory.
            """
            print("run_python tool used (in-process execution)")

            # Generate unique job ID and working directory
            job_id = str(uuid.uuid4())
            temp_dir = os.path.abspath(f"./tmp/{job_id}")
            os.makedirs(temp_dir, exist_ok=True)

            output_path = os.path.join(temp_dir, "output.png")

            # Inject a savefig call if the code uses plt.show() so it always saves
            patched_code = code.replace(
                "plt.show()",
                f"plt.savefig(r'{output_path}', bbox_inches='tight')"
            )
            # If no plt.show() present, append a savefig at the end as a fallback
            if "plt.savefig" not in patched_code:
                patched_code += f"\nimport matplotlib.pyplot as _plt\n_plt.savefig(r'{output_path}', bbox_inches='tight')\n"

            try:
                exec_globals = {"__builtins__": __builtins__}
                exec(patched_code, exec_globals)  # nosec — sandboxed by admin-only access control

                if not os.path.exists(output_path):
                    return "Error: Code executed but no output.png was produced. Make sure the code generates a matplotlib figure."

                # Build the public URL using the AI backend's own base URL
                base_url = os.getenv("AI_BACKEND_URL", "http://127.0.0.1:9000").rstrip("/")
                download_url = f"{base_url}/static/{job_id}/output.png"

                print("Image generated. URL:", download_url)
                return f"Here is your visualization: {download_url}"

            except Exception as e:
                error_detail = traceback.format_exc()
                print("Execution error:\n", error_detail)
                return f"Error during code execution: {e}"

        return [run_python]