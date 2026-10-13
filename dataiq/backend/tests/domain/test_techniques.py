import pytest

from app.domain.techniques import (
    PublishingNotAllowed,
    TransitionNotAllowed,
    VersionState,
    validate_publishing,
    validate_transition,
)
from app.domain.users import Role


@pytest.mark.parametrize(
    ("current", "new_"),
    [
        (VersionState.draft, VersionState.in_review),
        (VersionState.draft, VersionState.published),
        (VersionState.in_review, VersionState.draft),
        (VersionState.in_review, VersionState.published),
        (VersionState.published, VersionState.superseded),
        (VersionState.published, VersionState.archived),
    ],
)
def test_allowed_transitions(current, new_):
    validate_transition(current, new_)


@pytest.mark.parametrize(
    ("current", "new_"),
    [
        (VersionState.published, VersionState.draft),
        (VersionState.archived, VersionState.published),
        (VersionState.superseded, VersionState.published),
        (VersionState.draft, VersionState.draft),
    ],
)
def test_forbidden_transitions(current, new_):
    with pytest.raises(TransitionNotAllowed):
        validate_transition(current, new_)


@pytest.mark.parametrize("role", [Role.reviewer, Role.admin])
def test_reviewer_and_admin_can_publish(role):
    validate_publishing(role)


@pytest.mark.parametrize("role", [Role.user, Role.contributor])
def test_user_and_contributor_cannot_publish(role):
    with pytest.raises(PublishingNotAllowed):
        validate_publishing(role)
