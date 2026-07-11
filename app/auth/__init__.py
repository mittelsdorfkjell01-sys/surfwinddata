"""Admin authentication (Sprint A): password hashing, JWT sessions, role guards.

The public seam used by the API layer is :mod:`app.auth.deps`
(``current_user`` / ``require_role`` / ``get_actor``) and :mod:`app.auth.service`
(user CRUD + ``bootstrap_admin``).
"""
