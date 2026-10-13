import pytest

from app.domain.errors import Forbidden
from app.domain.users import Role, has_at_least, require_role


def test_roles_are_cumulative():
    assert has_at_least(Role.admin, Role.contributor)
    assert has_at_least(Role.reviewer, Role.reviewer)
    assert not has_at_least(Role.contributor, Role.reviewer)
    assert not has_at_least(Role.user, Role.contributor)


def test_require_role_fails_when_role_is_too_low():
    with pytest.raises(Forbidden):
        require_role(Role.user, Role.contributor)
