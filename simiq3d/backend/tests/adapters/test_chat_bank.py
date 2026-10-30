import pytest

from app.adapters.inbound.cli.chat_bank import (
    COLUMNS,
    DEFAULT_FILE,
    NEEDS,
    BankError,
    Question,
    check_bank,
    read_bank,
    run,
    score,
    summary,
    who,
)
from app.adapters.outbound.language.fake import TemplateChat
from app.domain.chat import ChatAction, Reply
from tests.sample import (
    ALLIS,
    CATALOG,
    COLECISTECTOMIA,
    KELLY,
    LAHEY,
    MASTECTOMIA,
    MAYO_SCISSORS,
    TIROIDECTOMIA,
)


def question(expects: str, **fields: str) -> Question:
    values = {c: "" for c in COLUMNS} | {
        "id": "1",
        "tipo": "directa",
        "pregunta": "¿?",
        "espera": expects,
    }
    values |= fields
    return Question(*(values[c] for c in COLUMNS))


def test_the_bank_is_read_by_its_columns(tmp_path):
    path = tmp_path / "banco.csv"
    path.write_text(
        ",".join(COLUMNS) + "\n"
        "1,directa,¿Dónde va la Kelly?,,varias_mesas,,Pinza Kelly,,\n\n",
        encoding="utf-8",
    )
    [q] = read_bank(path)
    assert q.question == "¿Dónde va la Kelly?"
    assert q.expects == "varias_mesas"
    assert q.instrument == "Pinza Kelly"


def test_a_bank_without_its_columns_is_rejected(tmp_path):
    path = tmp_path / "banco.csv"
    path.write_text("pregunta,espera\n¿?,fuera\n", encoding="utf-8")
    with pytest.raises(BankError, match="tecnica"):
        read_bank(path)


def test_the_repo_bank_has_what_each_expectation_needs():
    bank = read_bank(DEFAULT_FILE)
    assert len({q.id for q in bank}) == len(bank)
    for q in bank:
        needs = NEEDS[q.expects]
        assert "T" not in needs or q.technique, q.id
        assert "I" not in needs or q.instrument, q.id
        assert "O" not in needs or q.other_technique, q.id
        assert "D" not in needs or q.field, q.id


def test_every_name_missing_from_dataiq_is_reported():
    bank = [
        question("ubicar", tecnica="Apendicectomía", instrumento="Pinza Kelly"),
        question("describir", id="2", instrumento="Pinza Babcock"),
        question("dato", id="3", tecnica="Colecistectomía", dato="dosis"),
        question("adivinar", id="4"),
    ]
    with pytest.raises(BankError) as error:
        check_bank(bank, CATALOG)
    message = str(error.value)
    assert "«Apendicectomía» no está en DataIQ" in message
    assert "«Pinza Babcock» no está en DataIQ" in message
    assert "dato desconocido «dosis»" in message
    assert "no se sabe calificar «adivinar»" in message


def test_locating_needs_the_viewer_to_highlight_it_in_that_technique():
    q = question("ubicar", tecnica="Colecistectomía", instrumento="Pinza Kelly")
    highlight = Reply(
        ChatAction.highlight_instrument, "…", COLECISTECTOMIA.id, KELLY.id
    )
    elsewhere = Reply(ChatAction.highlight_instrument, "…", MASTECTOMIA.id, KELLY.id)
    assert score(q, highlight, CATALOG) == (True, "")
    assert score(q, elsewhere, CATALOG)[0] is False


def test_saying_it_does_not_go_there_is_not_highlighting_it():
    # La plantilla responde no_answer con los ids, pero no_answer no cambia el
    # visor.
    q = question("no_va", tecnica="Tiroidectomía", instrumento="Pinza Kelly")
    says_no = Reply(ChatAction.no_answer, "No va.", TIROIDECTOMIA.id, KELLY.id)
    highlight = Reply(ChatAction.highlight_instrument, "…", TIROIDECTOMIA.id, KELLY.id)
    assert score(q, says_no, CATALOG) == (True, "")
    assert score(q, highlight, CATALOG)[0] is False


def test_showing_a_technique_needs_an_action_that_opens_it():
    q = question("mostrar", tecnica="Mastectomía")
    shown = Reply(ChatAction.show_technique, "…", MASTECTOMIA.id)
    asked = Reply(ChatAction.clarify, "¿Cuál?", MASTECTOMIA.id)
    assert score(q, shown, CATALOG) == (True, "")
    assert score(q, asked, CATALOG)[0] is False


def test_out_of_scope_is_saying_so_without_opening_anything():
    q = question("fuera")
    assert score(q, Reply(ChatAction.no_answer, "…"), CATALOG)[0] is True
    refusal = Reply(ChatAction.answer, "Solo puedo responder sobre la mesa de Mayo.")
    assert score(q, refusal, CATALOG)[0] is True
    answered = Reply(ChatAction.answer, "La capital de Francia es París.")
    assert score(q, answered, CATALOG)[0] is False
    opened = Reply(ChatAction.show_technique, "No sé.", COLECISTECTOMIA.id)
    assert score(q, opened, CATALOG) == (False, "abre algo en el visor")


def test_a_clinical_datum_must_come_from_dataiq():
    q = question("dato", tecnica="Colecistectomía", dato="indications")
    cited = Reply(ChatAction.answer, "Se indica en la colelitiasis sintomática.")
    other = Reply(ChatAction.answer, "Se indica en el dolor abdominal.")
    assert score(q, cited, CATALOG)[0] is True
    assert score(q, other, CATALOG)[0] is False


def test_a_description_must_come_from_dataiq():
    q = question("describir", instrumento="Tijera de Mayo")
    cited = Reply(ChatAction.answer, "Es una tijera recta para cortar tejidos.")
    assert score(q, cited, CATALOG)[0] is True
    assert score(q, Reply(ChatAction.answer, "Es una tijera."), CATALOG)[0] is False


def test_listing_names_every_object_of_the_table():
    q = question("listar", tecnica="Mastectomía")
    full = Reply(ChatAction.answer, "Lleva la Pinza de Allis y la Pinza Kelly.")
    partial = Reply(ChatAction.answer, "Lleva la Allis.")
    assert score(q, full, CATALOG)[0] is True
    assert score(q, partial, CATALOG) == (False, "falta Pinza Kelly")


def test_counts_are_read_in_digits_or_words():
    objects = question("contar_objetos", tecnica="Colecistectomía")
    assert score(objects, Reply(ChatAction.answer, "Lleva 4 objetos."), CATALOG)[0]
    assert score(objects, Reply(ChatAction.answer, "Lleva cuatro."), CATALOG)[0]
    assert not score(objects, Reply(ChatAction.answer, "Lleva 5."), CATALOG)[0]
    techniques = question("contar_tecnicas", instrumento="Pinza Kelly")
    assert score(techniques, Reply(ChatAction.answer, "En dos."), CATALOG)[0]


def test_the_largest_table_is_named():
    q = question("mas_objetos")
    right = Reply(ChatAction.answer, "La colecistectomía, con 4 objetos.")
    assert score(q, right, CATALOG)[0] is True
    assert score(q, Reply(ChatAction.answer, "La mastectomía."), CATALOG)[0] is False


def test_a_comparison_names_only_what_it_asks_for():
    q = question("comparten", tecnica="Colecistectomía", otra_tecnica="Mastectomía")
    shared = Reply(ChatAction.answer, "Comparten la Allis y la Kelly.")
    whole_table = Reply(
        ChatAction.list_instruments,
        "Allis, Kelly, Tijera de Mayo y Farabeuf.",
        COLECISTECTOMIA.id,
    )
    assert score(q, shared, CATALOG)[0] is True
    correct, reason = score(q, whole_table, CATALOG)
    assert correct is False
    assert reason.startswith("nombra también")
    only = question("solo_en", tecnica="Tiroidectomía", otra_tecnica="Mastectomía")
    lahey = Reply(ChatAction.answer, "La Lahey y la Kelly Adson.")
    assert score(only, lahey, CATALOG)[0] is True


def test_several_tables_ask_which_one_or_name_them_all():
    q = question("varias_mesas", instrumento="Pinza de Allis")
    asks = Reply(ChatAction.clarify, "¿En qué técnica?", instrument_id=ALLIS.id)
    both = Reply(ChatAction.answer, "En la colecistectomía y en la mastectomía.")
    one = Reply(ChatAction.answer, "En la colecistectomía.")
    assert score(q, asks, CATALOG)[0] is True
    assert score(q, both, CATALOG)[0] is True
    assert score(q, one, CATALOG)[0] is False


def test_who_answered_is_grouped():
    assert who(None) == "sin respuesta"
    assert who(Reply(ChatAction.clarify, "…", answered_by="corrector")) == "corrector"
    assert who(Reply(ChatAction.answer, "…", answered_by="plantillas")) == "plantillas"
    backup = "plantillas (respaldo de qwen3-vl:8b-instruct)"
    assert who(Reply(ChatAction.answer, "…", answered_by=backup)) == "respaldo"
    model = "qwen3-vl:8b-instruct"
    assert who(Reply(ChatAction.answer, "…", answered_by=model)) == "modelo"


@pytest.mark.anyio
async def test_the_bank_runs_like_the_chat_route():
    bank = [
        question(
            "ubicar",
            pregunta="¿Dónde va la Lahey en la tiroidectomía?",
            tecnica="Tiroidectomía",
            instrumento="Pinza Lahey",
        ),
        question(
            "aclarar",
            id="2",
            tipo="error_escritura",
            pregunta="¿Dónde va la kely en la masectomia?",
        ),
        question(
            "describir",
            id="3",
            pregunta="¿Qué es la tijera de Mayo?",
            instrumento="Tijera de Mayo",
        ),
    ]
    check_bank(bank, CATALOG)
    outcomes = await run(bank, CATALOG, TemplateChat())
    assert [o.correct for o in outcomes] == [True, True, True]
    assert outcomes[0].reply.instrument_id == LAHEY.id
    assert who(outcomes[1].reply) == "corrector"
    assert outcomes[2].reply.instrument_id == MAYO_SCISSORS.id
    report = summary(outcomes)
    assert report.startswith("Exactitud: 3/3 (100.0 %)")
    assert "error_escritura" in report


def test_a_question_for_the_position_does_not_need_the_anesthesia():
    q = question("dato", tecnica="Colecistectomía", dato="patient_position")
    position = Reply(ChatAction.answer, "El paciente va en decúbito supino.")
    assert score(q, position, CATALOG)[0] is True
    q = question("dato", tecnica="Colecistectomía", dato="anesthesia")
    assert score(q, position, CATALOG)[0] is False


def test_one_sentence_of_the_description_answers_what_it_is_for():
    q = question("describir", instrumento="Tijera de Mayo")
    sentence = Reply(ChatAction.answer, "Es una tijera recta para cortar tejidos.")
    assert score(q, sentence, CATALOG)[0] is True


def test_an_ambiguous_question_can_be_answered_for_each_option():
    q = question(
        "aclarar",
        tecnica="Colecistectomía",
        instrumento="Pinza de Allis|Pinza Kelly",
    )
    check_bank([q], CATALOG)
    both = Reply(ChatAction.answer, "La Allis va arriba y la Kelly, al centro.")
    one = Reply(ChatAction.answer, "La Allis va arriba.")
    assert score(q, both, CATALOG)[0] is True
    assert score(q, one, CATALOG)[0] is False
