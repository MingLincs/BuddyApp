# WHERE TO ADD DELETE BUTTON

## STEP 1: Add state for delete modal

After line 16 (where you have `const [creating, setCreating] = useState(false);`), ADD:

```typescript
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [classToDelete, setClassToDelete] = useState<ClassRow | null>(null);
const [deleting, setDeleting] = useState(false);
```

## STEP 2: Add delete function

After your `createClass()` function (around line 60), ADD:

```typescript
async function deleteClass() {
  if (!classToDelete) return;

  setDeleting(true);
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) throw new Error("Not signed in");

    const res = await fetch(`${API_BASE}/classes/${classToDelete.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to delete class");

    await loadClasses();
    setShowDeleteModal(false);
    setClassToDelete(null);
    alert(`${classToDelete.name} deleted successfully`);
  } catch (error) {
    console.error("Error deleting class:", error);
    alert("Failed to delete class. Please try again.");
  } finally {
    setDeleting(false);
  }
}

function confirmDelete(cls: ClassRow, e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  setClassToDelete(cls);
  setShowDeleteModal(true);
}
```

## STEP 3: Change the class card structure

FIND this section (around line 180):

```typescript
{classes.map((cls, index) => (
  <Link
    key={cls.id}
    href={`/class/${cls.id}`}
    className="class-card"
  >
```

REPLACE WITH:

```typescript
{classes.map((cls, index) => (
  <div key={cls.id} className="class-card-wrapper">
    <Link
      href={`/class/${cls.id}`}
      className="class-card"
    >
```

## STEP 4: Add the delete button

RIGHT AFTER the closing `</Link>` tag (but BEFORE the closing `</div>` for class-card-wrapper), ADD:

```typescript
    </Link>

    {/* DELETE BUTTON */}
    <button
      className="delete-class-btn"
      onClick={(e) => confirmDelete(cls, e)}
      title="Delete class"
    >
      🗑️
    </button>
  </div>
))}
```

## STEP 5: Add delete modal

RIGHT AFTER your "New Class Modal" closing tag (around line 260), ADD:

```typescript
      {/* Delete Confirmation Modal */}
      {showDeleteModal && classToDelete && (
        <div 
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="warning-icon">⚠️</div>
            <h2 className="modal-title">Delete Class?</h2>
            <p className="modal-subtitle">
              Are you sure you want to delete <strong>{classToDelete.name}</strong>?
              <br />
              <span className="warning-text">
                This will permanently delete all documents, concept maps, flashcards, 
                and other materials associated with this class.
              </span>
            </p>

            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-danger"
                onClick={deleteClass}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Class'}
              </button>
            </div>
          </div>
        </div>
      )}
```

## STEP 6: Add CSS styles

In your `<style jsx>` section, ADD these new styles:

```css
/* Wrapper for card + delete button */
.class-card-wrapper {
  position: relative;
}

/* DELETE BUTTON STYLES */
.delete-class-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  background: rgba(239, 68, 68, 0.9);
  border: none;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0;
  z-index: 10;
  backdrop-filter: blur(10px);
}

.class-card-wrapper:hover .delete-class-btn {
  opacity: 1;
}

.delete-class-btn:hover {
  background: rgba(220, 38, 38, 1);
  transform: scale(1.1);
}

.warning-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 16px;
}

.warning-text {
  display: block;
  margin-top: 12px;
  color: #ef4444;
  font-weight: 600;
}

.modal-btn-danger {
  background: #ef4444;
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.modal-btn-danger:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

@media (max-width: 768px) {
  .delete-class-btn {
    opacity: 1; /* Always visible on mobile */
  }
}
```

DONE! The delete button will now appear on hover over each class card.
