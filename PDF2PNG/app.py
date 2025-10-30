import streamlit as st
import pypdfium2
from dotenv import load_dotenv
import os
import io
import zipfile
import PyPDF2

# --- Configuration and Page Setup ---
st.set_page_config(
    page_title="PDF to PNG Converter",
    page_icon="📄",
    layout="wide"
)

# --- Caching ---
@st.cache_data(max_entries=5)
def perform_conversion(pdf_bytes, dpi):
    """
    Converts PDF bytes into a list of image bytes and a zip file using pypdfium2.
    Fully compatible with Streamlit Cloud (no Poppler required).
    """
    try:
        pdf = pypdfium2.PdfDocument(io.BytesIO(pdf_bytes))
        image_bytes_list = []
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for i in range(len(pdf)):
                page = pdf[i]
                # Render each page to a PIL image (scale factor adjusts DPI)
                pil_image = page.render(scale=dpi / 72).to_pil()

                img_buffer = io.BytesIO()
                pil_image.save(img_buffer, format="PNG")
                img_bytes = img_buffer.getvalue()

                image_bytes_list.append(img_bytes)
                zf.writestr(f"page_{i + 1:03d}.png", img_bytes)

        return image_bytes_list, zip_buffer.getvalue()

    except Exception as e:
        return None, str(e)

# --- NEW: Image Dialog Function ---
@st.dialog("Enlarged Image")
def show_image_dialog(image_bytes, page_num):
    """Displays the selected image in a large dialog box."""
    st.image(image_bytes, caption=f"Page {page_num}", width='stretch') 
    if st.button("Close"):
        st.rerun()

# --- Sidebar ---
with st.sidebar:
    st.header("Upload & Settings")
    uploaded_file = st.file_uploader("Select a PDF file", type=["pdf"])
    
    load_dotenv() 
    dpi_options = [150, 300, 600]
    try:
        default_dpi = int(os.getenv("OUTPUT_DPI", 300))
        default_index = dpi_options.index(default_dpi)
    except ValueError:
        default_index = 1 
    
    dpi = st.selectbox(
        "Select Image Resolution (DPI)",
        options=dpi_options,
        index=default_index,
        help="Higher DPI means higher quality and longer conversion time."
    )
    
    st.markdown("---")
    st.write("This app converts your PDF into high-quality PNG images.")

# --- Main Page ---
st.title("📄 PDF to High-Quality PNG Converter")

# --- Function to check page count ---
def get_pdf_page_count(pdf_bytes):
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        return len(reader.pages)
    except Exception:
        return 101  # fallback if unable to count

if uploaded_file is not None:
    pdf_bytes = uploaded_file.getvalue()
    pdf_filename = os.path.splitext(uploaded_file.name)[0]
    
    # Check page count
    page_count = get_pdf_page_count(pdf_bytes)
    MAX_SAFE_PAGES = 50 
    MAX_SAFE_DPI = 150

    # Safety limit to prevent memory issues
    if page_count > MAX_SAFE_PAGES and dpi > MAX_SAFE_DPI:
        st.warning(
            f"⚠️ **Memory Safety Triggered:** Your PDF has {page_count} pages. "
            f"Due to server memory limits, the DPI has been reduced from {dpi} to **{MAX_SAFE_DPI}** to prevent the app from crashing."
        )
        dpi_safe = MAX_SAFE_DPI
    else:
        dpi_safe = dpi

    file_id = uploaded_file.file_id

    if ("last_file_id" not in st.session_state or 
        st.session_state.last_file_id != file_id or 
        st.session_state.last_dpi != dpi_safe):
        
        with st.spinner(f"Converting '{uploaded_file.name}' at {dpi_safe} DPI..."):
            image_bytes_list, zip_data = perform_conversion(pdf_bytes, dpi_safe)
            
            st.session_state.image_bytes_list = image_bytes_list
            st.session_state.zip_data = zip_data
            st.session_state.last_file_id = file_id
            st.session_state.last_dpi = dpi_safe
            st.session_state.pdf_filename = pdf_filename
            
            if isinstance(image_bytes_list, list):
                st.success(f"✅ Conversion successful! Found {len(image_bytes_list)} pages.")
            else:
                st.error(f"❌ A conversion error occurred: {zip_data}")
                st.session_state.clear()

    # --- Display Results ---
    if "image_bytes_list" in st.session_state and isinstance(st.session_state.image_bytes_list, list):
        image_bytes_list = st.session_state.image_bytes_list
        zip_data = st.session_state.zip_data
        pdf_filename = st.session_state.pdf_filename

        st.download_button(
            label=f"Download All Pages as .ZIP",
            data=zip_data,
            file_name=f"{pdf_filename}_all_pages.zip",
            mime="application/zip",
            width='stretch',
            on_click="ignore"
        )
        
        st.divider()
        st.subheader("Individual Page Downloads")
        
        cols = st.columns(3)
        for i, img_bytes in enumerate(image_bytes_list):
            page_name = f"{pdf_filename}_page_{i + 1:03d}.png"
            
            with cols[i % 3]:
                st.image(img_bytes, caption=f"Page {i + 1}", width='stretch')
                btn_col1, btn_col2 = st.columns(2)

                with btn_col1:
                    if st.button("Enlarge 🔎", key=f"enlarge_{i}", use_container_width=True):
                        show_image_dialog(img_bytes, i + 1)

                with btn_col2:
                    st.download_button(
                        label="Download ⬇️",
                        data=img_bytes,
                        file_name=page_name,
                        mime="image/png",
                        use_container_width=True,
                        key=f"download_{i}",
                        on_click="ignore"
                    )
                st.markdown("---")
else:
    if "last_file_id" in st.session_state:
        st.session_state.clear()
    st.info("Please upload a PDF file using the sidebar on the left to begin.")
