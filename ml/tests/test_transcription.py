from transcription import read_pylaia_output


def test_read_pylaia_output_sorts_lines_and_skips_noise():
    # What PyLaia prints: info messages, results in random order, progress bar
    output = (
        "[2026-10-19 INFO laia] Arguments: ...\n"
        "0002.png Egressi clenavicula\n"
        "0000.png comitibus Gallo\n"
        "0001.png to nomine comini\n"
        "Decoding: 100%\n"
    )

    lines = read_pylaia_output(output)

    assert [line.index for line in lines] == [0, 1, 2]
    assert lines[0].text == "comitibus Gallo"


def test_read_pylaia_output_keeps_empty_lines():
    # A line where the model read nothing still counts, so the numbers stay correct
    lines = read_pylaia_output("0000.png\n")

    assert len(lines) == 1
    assert lines[0].text == ""
