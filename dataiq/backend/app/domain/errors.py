class NotFound(Exception):
    pass


class Forbidden(Exception):
    pass


class Conflict(Exception):
    """La operación choca con el estado actual (p. ej. otro revisor ya decidió)."""


class InvalidContent(Exception):
    def __init__(self, problems: list[str]) -> None:
        super().__init__("; ".join(problems))
        self.problems = problems
