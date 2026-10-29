# Outbreak Tree

Caso real: un brote zombie modelado como un árbol n-ario. El paciente cero es la raíz y cada mordida crea un hijo del zombie que mordió.

Librería de árboles: [anytree](https://anytree.readthedocs.io). Backend en Flask y UI web en HTML, CSS y JavaScript.

## Operaciones

- Insertar: registrar una mordida (nuevo hijo).
- Eliminar: quitar a un sujeto y toda su rama.
- Buscar: rastrear a un sujeto hasta el paciente cero (camino a la raíz).
- Recorridos: preorden, postorden y por niveles, animados en el mapa.
- Métricas: total de nodos, altura, hojas, estados y quién mordió más.

## Ejecutar

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python app.py
```

Abrir http://localhost:5050

## Pruebas

```bash
.venv/bin/pytest
```
