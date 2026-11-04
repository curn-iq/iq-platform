from app.domain.chat import ChatAction, ClinicalField, Reply
from app.domain.requests import Request, RequestKind, requests_of
from tests.sample import CATALOG, COLECISTECTOMIA, KELLY


def test_what_the_viewer_did_goes_back_as_a_request():
    located = Reply(
        ChatAction.highlight_instrument,
        "…",
        technique_id=COLECISTECTOMIA.id,
        instrument_id=KELLY.id,
    )
    datum = Reply(
        ChatAction.show_clinical_data,
        "…",
        technique_id=COLECISTECTOMIA.id,
        field=ClinicalField.indications,
    )

    assert requests_of(located, CATALOG) == (
        Request(RequestKind.locate, "Colecistectomía", "Pinza Kelly"),
    )
    assert requests_of(datum, CATALOG) == (
        Request(
            RequestKind.clinical_data,
            "Colecistectomía",
            field=ClinicalField.indications,
        ),
    )


def test_a_reply_that_did_not_change_the_viewer_has_no_requests():
    assert requests_of(Reply(ChatAction.answer, "Hola."), CATALOG) == ()
