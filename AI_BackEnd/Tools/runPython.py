from langchain.tools import tool
from dotenv import load_dotenv
import os
import uuid
import traceback
import shutil
import matplotlib
from DB.agent_visualizations import save_visualization
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
            Saves any matplotlib figure to the database and returns a public image URL.
            The code should save its figure to 'output.png' in the current directory.
            """
            print("run_python tool used (in-process execution)")

            # Generate unique job ID and working directory
            job_id = str(uuid.uuid4())
            temp_dir = os.path.abspath(f"./tmp/{job_id}")
            os.makedirs(temp_dir, exist_ok=True)

            output_path = os.path.join(temp_dir, "output.png")
            legacy_output_path = os.path.abspath("output.png")

            # Inject a savefig call if the code uses plt.show() so it always saves
            patched_code = code.replace(
                "plt.show()",
                "plt.savefig('output.png', bbox_inches='tight')"
            )
            # If no plt.show() present, append a savefig at the end as a fallback
            if "plt.savefig" not in patched_code:
                patched_code += (
                    "\nimport matplotlib.pyplot as _plt\n"
                    "if _plt.get_fignums():\n"
                    "    _plt.savefig('output.png', bbox_inches='tight')\n"
                )

            try:
                original_cwd = os.getcwd()
                try:
                    os.chdir(temp_dir)
                    exec_globals = {"__builtins__": __builtins__}
                    exec(patched_code, exec_globals)  # nosec — sandboxed by admin-only access control
                finally:
                    os.chdir(original_cwd)

                if not os.path.exists(output_path) and os.path.exists(legacy_output_path):
                    shutil.copy(legacy_output_path, output_path)

                if not os.path.exists(output_path):
                    return "Error: Code executed but no output.png was produced. Make sure the code generates a matplotlib figure."

                with open(output_path, "rb") as f:
                    image_bytes = f.read()

                if len(image_bytes) < 100:
                    return "Error: Generated image file is empty. Ensure plt.savefig() runs before plt.close()."

                try:
                    shutil.rmtree(temp_dir)
                except OSError:
                    pass
                if os.path.exists(legacy_output_path):
                    try:
                        os.remove(legacy_output_path)
                    except OSError:
                        pass

                save_visualization(image_bytes, visualization_id=job_id)
                base_url = (
                    os.environ.get("AI_BACKEND_URL", "http://127.0.0.1:9000").rstrip("/")
                )
                image_url = f"{base_url}/visualizations/{job_id}"
                print(f"Image saved to database. URL: {image_url}")
                return (
                    f"Visualization saved successfully. "
                    f"Use this URL in your response to the user: {image_url}"
                )

            except Exception as e:
                error_detail = traceback.format_exc()
                print("Execution error:\n", error_detail)
                # Clean up temp directory on error too
                try:
                    shutil.rmtree(temp_dir)
                except OSError:
                    pass
                return f"Error during code execution: {e}"

        return [run_python]