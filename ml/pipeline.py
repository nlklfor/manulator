from segmentation import run_segmentation
from transcription import run_transcription


class Task:
    # Data might be an image, text or any other type of data that the task will process
    # options is a dictionary that can contain any additional parameters such as
    # language
    def __init__(self, input: str, options: dict = None, data: any = None) -> None:
        self.input = input
        self.options = options

        # Add here your action
        self.actions = {
            "Detect Lines": run_segmentation,
            "Transcribe": run_transcription,
            "Translate": None,
            "Summarize": None,
        }
        self.data = data

        self.dependencies = {
            "Detect Lines": [],
            "Transcribe": ["Detect Lines"],
            "Translate": ["Detect Lines", "Transcribe"],
            "Summarize": ["Detect Lines", "Transcribe", "Translate"],
        }


# runs the pipeline for a given task, including its dependencies
class Pipeline:
    def __init__(self, task: Task) -> None:
        self.task = task

        self.actions = {
            "Detect Lines": run_segmentation,
            "Transcribe": run_transcription,
        }

    # run the action specified in the task, along with its dependencies
    def run(self):
        # if input in task matches exactly one of the actions, run that action
        result = {}
        if self.task.input in self.actions:
            # check dependencies for the action, if any
            dependencies = self.task.dependencies[self.task.input]

            # the final action to run is the one specified in the task
            action_func = self.actions[self.task.input]

            # run all dependencies first
            for dependency in dependencies:
                if dependency in self.actions:
                    dep_func = self.actions[dependency]
                    print(f"Running dependency: {dependency}")
                    result[dependency] = dep_func(self.task.data, self.task.options)
                else:
                    raise ValueError(f"Unknown dependency: {dependency}")
            print(f"Running action: {self.task.input}")
            result[self.task.input] = action_func(self.task.data, self.task.options)

        return result


# Called by the backend: uv run python pipeline.py <input> <image_id> <image_file>
# The last printed line is the path of the result file:
# the overlay image for "Detect Lines", transcription.json for "Transcribe".
if __name__ == "__main__":
    import sys
    from pathlib import Path

    action, image_id, image_file = sys.argv[1:4]
    data = {"image_id": image_id, "image": Path(image_file).read_bytes()}
    pipeline = Pipeline(Task(action, data=data))
    result = pipeline.run()
    if action not in result:
        sys.exit(f"Unknown step: {action}")
    output = result[action]
    print(output.get("image_path") or output.get("json_path"))
