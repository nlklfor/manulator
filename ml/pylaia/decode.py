"""Start PyLaia's line reading (pylaia-htr-decode-ctc) without its package list.

At startup PyLaia lists its installed packages for logging, using `pip freeze`.
On Windows those lines end in \r, which PyLaia's parser rejects, so it crashes
before reading anything. This turns off that list only; reading is unaffected.

transcription.py runs this file in PyLaia's environment, with the same arguments
as pylaia-htr-decode-ctc.
"""

import laia.scripts.htr
from laia.scripts.htr.decode_ctc import main

# An empty list means "nothing to log", so PyLaia skips the package list
laia.scripts.htr.get_installed_versions = lambda: []

if __name__ == "__main__":
    main()
