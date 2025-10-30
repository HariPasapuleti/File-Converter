# PDF to PNG Converter

A simple tool to convert PDF files into high-quality PNG images using Streamlit or command-line execution.

🔗 **Live App:** [https://pdf2png.streamlit.app/](https://pdf2png.streamlit.app/)

---

## 🚀 Features

* Convert PDFs to high-quality PNG images
* Adjustable DPI (150, 300, 600)
* Download pages individually or as ZIP
* Memory-safe for large PDFs
* CLI support using `.env` configuration

---

## 🖥️ Run the Streamlit App

```bash
git clone https://github.com/<your-username>/pdf-to-png-converter.git
cd pdf-to-png-converter
pip install -r requirements.txt
streamlit run app.py
```

---

## ⚙️ Run via Command Line

Create a `.env` file:

```env
PDF_FILE_PATH=C:/Users/Hari/Desktop/sample.pdf
OUTPUT_DPI=300
```

Then run:

```bash
python pdf_to_png.py
```

Output images will be saved in `output_images/<pdf_name>/`.

---

## 🛠️ Requirements

* Python 3.8+
* Poppler (required for `pdf2image`)
* Install dependencies:

```bash
pip install -r requirements.txt
```

### 📦 Poppler Installation

* **Windows:** Download from [Poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases/tag/v24.07.0-0)
  📺 Watch setup video tutorial: [YouTube Guide](https://www.youtube.com/watch?v=oO6UeweyXnw&list=PLtdjj8-_G95avR_rgTXSTM91ziE0G4cjS&index=2&t=20s)
* **macOS:**

  ```bash
  brew install poppler
  ```
* **Linux:**

  ```bash
  sudo apt install poppler-utils
  ```

---

## 💡 Author

**Hari Veera Venkat Pasapuleti**

---

### 🌟 Star this repo if you find it helpful!
