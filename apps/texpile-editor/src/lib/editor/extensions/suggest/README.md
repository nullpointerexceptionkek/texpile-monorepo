Custom replacement for prosemirror-suggest, powering the @-citation dropdown.
Exists because the original missed a trigger char typed right after an inline atom (citation, inline math): it searched from $pos.before(). This one searches from the parent block start.
