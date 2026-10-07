class NoEncontrado(Exception):
    pass


class SinPermiso(Exception):
    pass


class Conflicto(Exception):
    """La operación choca con el estado actual (p. ej. otro revisor ya decidió)."""


class ContenidoInvalido(Exception):
    def __init__(self, problemas: list[str]) -> None:
        super().__init__("; ".join(problemas))
        self.problemas = problemas
