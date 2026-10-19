from services.segmentation import run_segmentation


class Task:
    # Data might be an image, text or any other type of data that the task will process
    # options is a dictionary that can contain any additional parameters such as
    # language
    def __init__(self, input: str, data: dict, options: dict = None) -> None:
        self.input = input
        self.options = options

        # Add here your action
        self.actions = {
            "Detect Lines": run_segmentation,
            "Transcribe": None, # add transcription here,
            "Translate": None,
            "Summarize": None
        }
        self.data = data

        # Define the dependencies for each action.
        # For example, "Transcribe" depends on "Detect Lines" being completed first.
        self.dependencies = {
            "Detect Lines": [],
            "Transcribe": ["Detect Lines"],
            "Translate": ["Detect Lines", "Transcribe"],
            "Summarize": ["Detect Lines", "Transcribe", "Translate"]
        }


# runs the pipeline for a given task, including its dependencies
class Pipeline:
    def __init__(self, task: Task) -> None:
        self.task = task

        self.actions = {
            "Detect Lines": run_segmentation,
            "Transcribe": None # add transcription function here,
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

