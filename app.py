from flask import Flask, jsonify, render_template, request

from outbreak import Outbreak

app = Flask(__name__)


def seed():
    outbreak = Outbreak("Marta Ruiz", "Central Hospital, Ward 4", "Day 1 03:10")
    outbreak.bite("Marta Ruiz", "Dr. Ibarra", "Central Hospital, Ward 4", "Day 1 04:45")
    outbreak.bite("Marta Ruiz", "Nurse Cole", "Central Hospital, Lobby", "Day 1 06:20")
    outbreak.bite("Dr. Ibarra", "Leo Park", "Metro Line 2", "Day 1 09:05")
    outbreak.bite("Dr. Ibarra", "Ana Silva", "Bakery on 5th", "Day 1 11:30")
    outbreak.bite("Nurse Cole", "Tom Reyes", "Gas Station 14", "Day 2 01:15")
    outbreak.bite("Leo Park", "Kim Osei", "Metro Line 2", "Day 2 08:40")
    outbreak.bite("Leo Park", "Raul Vega", "Stadium Gate C", "Day 2 19:00")
    outbreak.set_status("Tom Reyes", "eliminated")
    outbreak.set_status("Ana Silva", "cured")
    return outbreak


outbreak = seed()


def fail(error):
    return jsonify({"error": str(error)}), 400


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/state")
def state():
    return jsonify({"tree": outbreak.to_dict(), "metrics": outbreak.metrics()})


@app.post("/api/bite")
def bite():
    data = request.get_json(force=True)
    fields = [str(data.get(key, "")).strip() for key in ("biter", "victim", "place", "bitten_at")]
    if not all(fields):
        return fail("All fields are required")
    try:
        outbreak.bite(*fields)
    except ValueError as error:
        return fail(error)
    return state()


@app.post("/api/status")
def status():
    data = request.get_json(force=True)
    if data.get("status") not in ("infected", "cured", "eliminated"):
        return fail("Invalid status")
    try:
        outbreak.set_status(str(data.get("name", "")), data["status"])
    except ValueError as error:
        return fail(error)
    return state()


@app.delete("/api/zombie/<name>")
def remove(name):
    try:
        removed = outbreak.remove(name)
    except ValueError as error:
        return fail(error)
    return jsonify({"removed": removed, "tree": outbreak.to_dict(), "metrics": outbreak.metrics()})


@app.get("/api/chain/<name>")
def chain(name):
    try:
        return jsonify({"chain": outbreak.chain(name)})
    except ValueError as error:
        return fail(error)


@app.get("/api/traverse/<kind>")
def traverse(kind):
    try:
        return jsonify({"order": outbreak.traverse(kind)})
    except ValueError as error:
        return fail(error)


@app.post("/api/reset")
def reset():
    global outbreak
    outbreak = seed()
    return state()


if __name__ == "__main__":
    app.run(debug=True, port=5050)
