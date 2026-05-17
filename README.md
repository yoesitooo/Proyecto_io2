# Proyecto IO + IA: Distribución de Recursos Hospitalarios

Este proyecto integra un modelo de Investigación de Operaciones (RCPSP) con un agente de IA interactivo utilizando la API de Anthropic (Claude) y Next.js.

## Estructura de Archivos

```
proyecto-io-ia/
├── README.md
├── .gitignore
├── vercel.json
├── modelo/                        ← Modelo RCPSP en Python
│   ├── requirements.txt
│   ├── datos.py
│   ├── modelo_rcpsp.py
│   └── generar_resultados.py
└── frontend/                      ← Aplicación Next.js (Dashboard + IA)
    ├── package.json
    ├── next.config.js
    ├── .env.local.example
    ├── public/
    │   └── resultados.json        ← Generado por el modelo Python
    ├── app/
    │   ├── layout.jsx
    │   ├── page.jsx               
    │   ├── globals.css
    │   └── api/
    │       └── agente/
    │           └── route.js       
    └── components/
        ├── GraficoRed.jsx
        ├── TablaCalendario.jsx
        ├── PerfilRecursos.jsx
        └── ChatAgente.jsx
```

## Paso a paso para correr el modelo Python:
```bash
cd modelo
pip install -r requirements.txt
python generar_resultados.py
# Esto genera frontend/public/resultados.json
```

## Paso a paso para correr el frontend localmente:
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Editar .env.local y poner tu API key de Anthropic
npm run dev
# Abrir http://localhost:3000
```

## Cómo desplegar en Vercel:
1. Subir el repositorio a GitHub
2. Ir a vercel.com → New Project → importar el repo
3. En Environment Variables agregar: ANTHROPIC_API_KEY = sk-ant-...
4. Deploy → el frontend queda en https://tu-proyecto.vercel.app

**Nota:** El modelo Python se corre localmente para generar `resultados.json`, que se sube al repo dentro de `frontend/public/`. El agente IA funciona en Vercel via la API route protegida.
