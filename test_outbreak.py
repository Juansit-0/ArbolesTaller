import pytest

from outbreak import Outbreak


def build():
    outbreak = Outbreak("Zero", "Lab", "Day 1")
    outbreak.bite("Zero", "A", "Street", "Day 1")
    outbreak.bite("Zero", "B", "Park", "Day 1")
    outbreak.bite("A", "C", "Mall", "Day 2")
    return outbreak


def test_chain_goes_back_to_patient_zero():
    assert build().chain("C") == ["Zero", "A", "C"]


def test_traversals():
    outbreak = build()
    assert outbreak.traverse("preorder") == ["Zero", "A", "C", "B"]
    assert outbreak.traverse("postorder") == ["C", "A", "B", "Zero"]
    assert outbreak.traverse("levelorder") == ["Zero", "A", "B", "C"]


def test_metrics():
    metrics = build().metrics()
    assert metrics["total"] == 4
    assert metrics["height"] == 2
    assert metrics["leaves"] == ["C", "B"]
    assert metrics["top_biter"] == "Zero"


def test_remove_takes_whole_branch():
    outbreak = build()
    assert outbreak.remove("A") == ["A", "C"]
    assert outbreak.find("C") is None


def test_invalid_bites():
    outbreak = build()
    with pytest.raises(ValueError):
        outbreak.bite("Ghost", "D", "X", "Day 3")
    with pytest.raises(ValueError):
        outbreak.bite("Zero", "A", "X", "Day 3")
    outbreak.set_status("B", "cured")
    with pytest.raises(ValueError):
        outbreak.bite("B", "D", "X", "Day 3")
    with pytest.raises(ValueError):
        outbreak.remove("Zero")
