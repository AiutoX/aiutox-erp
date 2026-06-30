# Tags Module Testing Guide

## Running Tests

### All Tags Tests
```bash
cd backend
uv run pytest tests/core/tags/ -v
```

### With Coverage Report
```bash
uv run pytest tests/core/tags/ --cov=app/core/tags --cov-report=html
```

### Specific Test File
```bash
# Test models
uv run pytest tests/core/tags/test_tag_model.py -v

# Test service
uv run pytest tests/core/tags/test_tag_service.py -v

# Test permissions
uv run pytest tests/core/tags/test_tag_permissions.py -v

# Test events
uv run pytest tests/core/tags/test_tag_events.py -v
```

### Single Test
```bash
uv run pytest tests/core/tags/test_tag_model.py::TestTagModel::test_create_tag -v
```

## Test Coverage

**Target:** 80% minimum

**Run:** `uv run pytest tests/core/tags/ --cov=app/core/tags --cov-fail-under=80`

**Expected Coverage:**
- Models: 100% (13 tests)
- Service: 95%+ (22 tests)
- Permissions: 100% (10 tests)
- Events: 90%+ (10 tests)

**Total:** 55+ test cases

## Test Structure

```
tests/core/tags/
├── conftest.py           # Shared fixtures (tenant_id, tag_repository, etc.)
├── test_tag_model.py     # Model tests (Tag, TagCategory, EntityTag)
├── test_tag_service.py   # Service tests (CRUD, polymorphic operations)
├── test_tag_permissions.py  # RBAC tests
└── test_tag_events.py    # Event publishing tests
```

## Fixtures Available

- `tenant_id` - UUID for test tenant
- `user_id` - UUID for test user
- `tag_repository` - TagRepository instance
- `sample_tag` - Pre-created test tag
- `sample_category` - Pre-created test category
- `sample_entity_tag` - Pre-created entity-tag relationship
- `multiple_tags` - List of 3 sample tags

## Common Test Patterns

### Testing Model Constraints
```python
def test_tag_unique_constraint_per_tenant(self, db_session, tenant_id):
    """Verify tag names are unique per tenant."""
    tag1 = Tag(name="Review", tenant_id=tenant_id)
    tag2 = Tag(name="Review", tenant_id=tenant_id)

    db_session.add(tag1)
    db_session.commit()

    db_session.add(tag2)
    with pytest.raises(Exception):  # IntegrityError
        db_session.commit()
```

### Testing Service Operations
```python
def test_create_tag(self, db_session, tenant_id):
    """Test creating a tag via service."""
    service = TagService(db_session)

    tag = service.create_tag(
        name="Review",
        tenant_id=tenant_id,
        color="#00FF00",
    )

    assert tag.id is not None
    assert tag.name == "Review"
```

### Testing Permissions
```python
def test_permission_strings(self):
    """Test permission naming convention."""
    assert TAGS_READ == "tags.read"
    assert TAGS_WRITE == "tags.write"
    assert TAGS_DELETE == "tags.delete"
    assert TAGS_ADMIN == "tags.admin"
```

## Debugging Tests

### Verbose Output with Print Statements
```bash
uv run pytest tests/core/tags/test_tag_model.py -v -s
```

### Stop on First Failure
```bash
uv run pytest tests/core/tags/ -x
```

### Show Local Variables on Failure
```bash
uv run pytest tests/core/tags/ -l
```

### Run in Parallel (if supported)
```bash
uv run pytest tests/core/tags/ -n auto
```

## Continuous Integration

These tests should be run on every commit via CI/CD:

```yaml
# Example GitHub Actions
- name: Run Tags Tests
  run: |
    cd backend
    uv run pytest tests/core/tags/ --cov=app/core/tags --cov-fail-under=80
```

## Known Issues & Limitations

1. **Event Publishing** - Events use `safe_publish_event` which may skip in test context
2. **Async Fixtures** - Use pytest-asyncio if adding async tests
3. **Database Rollback** - Each test uses a fresh transaction

## Future Test Additions

- Integration tests for REST endpoints
- Load tests for polymorphic queries
- Event subscriber tests
- Permission enforcement tests in router
