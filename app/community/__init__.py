"""Community / UGC layer (Sprint C): public ratings, tips, submissions, images.

Write paths are rate-limited (Redis) with a honeypot, store a salted ``ip_hash``
(never a raw IP), and require accepting the versioned image license on upload.
"""
