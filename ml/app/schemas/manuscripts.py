from pydantic import BaseModel

class ManuscriptProcessPlan(BaseModel):
    manuscript_id: str
    steps: list[str]|None
    plan: str
    options: dict[str, str]|None


class ManuscriptProcessResponse(BaseModel):
    manuscript_id: str
    overlay: str  # JPEG as a data URL, usable directly as <img src>
    data: dict
    success: bool = False
    message: str|None = None