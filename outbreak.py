from anytree import Node, PreOrderIter, PostOrderIter, LevelOrderIter, find


class Outbreak:
    def __init__(self, patient_zero, place, bitten_at):
        self.root = Node(patient_zero, place=place, bitten_at=bitten_at, status="infected")

    def find(self, name):
        return find(self.root, lambda node: node.name.lower() == name.lower())

    def bite(self, biter, victim, place, bitten_at):
        parent = self.find(biter)
        if parent is None:
            raise ValueError(f"{biter} is not in the outbreak")
        if self.find(victim) is not None:
            raise ValueError(f"{victim} is already infected")
        if parent.status != "infected":
            raise ValueError(f"{biter} is {parent.status} and cannot bite")
        return Node(victim, parent=parent, place=place, bitten_at=bitten_at, status="infected")

    def set_status(self, name, status):
        node = self.find(name)
        if node is None:
            raise ValueError(f"{name} is not in the outbreak")
        node.status = status
        return node

    def remove(self, name):
        node = self.find(name)
        if node is None:
            raise ValueError(f"{name} is not in the outbreak")
        if node.is_root:
            raise ValueError("Patient zero cannot be removed")
        removed = [n.name for n in PreOrderIter(node)]
        node.parent = None
        return removed

    def chain(self, name):
        node = self.find(name)
        if node is None:
            raise ValueError(f"{name} is not in the outbreak")
        return [n.name for n in node.path]

    def traverse(self, kind):
        iterators = {"preorder": PreOrderIter, "postorder": PostOrderIter, "levelorder": LevelOrderIter}
        if kind not in iterators:
            raise ValueError(f"Unknown traversal {kind}")
        return [n.name for n in iterators[kind](self.root)]

    def metrics(self):
        nodes = list(PreOrderIter(self.root))
        biggest = max(nodes, key=lambda n: len(n.children))
        return {
            "total": len(nodes),
            "height": self.root.height,
            "leaves": [n.name for n in self.root.leaves],
            "infected": sum(n.status == "infected" for n in nodes),
            "cured": sum(n.status == "cured" for n in nodes),
            "eliminated": sum(n.status == "eliminated" for n in nodes),
            "top_biter": biggest.name,
            "top_bites": len(biggest.children),
        }

    def to_dict(self, node=None):
        node = node or self.root
        return {
            "name": node.name,
            "place": node.place,
            "bitten_at": node.bitten_at,
            "status": node.status,
            "depth": node.depth,
            "children": [self.to_dict(child) for child in node.children],
        }
