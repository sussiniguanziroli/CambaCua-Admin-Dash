import React, { useState, useEffect, useCallback } from "react";
import { storage } from "../../firebase/config";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import Swal from "sweetalert2";
import LoaderSpinner from "../utils/LoaderSpinner";

const VariationManager = ({
  productId,
  variations,
  setVariations,
  isSubmitting,
  onAnyVariationImageUploadingChange,
}) => {
  const [isUploadingVariationImage, setIsUploadingVariationImage] =
    useState(false);

  useEffect(() => {
    onAnyVariationImageUploadingChange(isUploadingVariationImage);
  }, [isUploadingVariationImage, onAnyVariationImageUploadingChange]);

  const handleVariationChange = useCallback(
    (index, field, value) => {
      const newVariations = [...variations];

      if (field === "precio") {
        newVariations[index][field] = parseFloat(value) || 0;
      } else if (field === "stock") {
        newVariations[index][field] = parseInt(value, 10) || 0;
      } else {
        newVariations[index][field] = value;
      }
      setVariations(newVariations);
    },
    [variations, setVariations]
  );

  const addVariationAttribute = useCallback(
    async (varIndex) => {
      // First, prompt for attribute name
      const { value: newAttributeName } = await Swal.fire({
        title: "Añadir Nuevo Atributo",
        input: "text",
        inputLabel:
          "Ingrese el nombre del nuevo atributo (ej: Talle, Material):",
        inputPlaceholder: "Nombre del atributo",
        showCancelButton: true,
        confirmButtonText: "Siguiente",
        cancelButtonText: "Cancelar",
        inputValidator: (value) => {
          if (!value || value.trim() === "") {
            return "El nombre del atributo no puede estar vacío.";
          }
          const newVariations = [...variations];
          const existingAttributes = newVariations[varIndex].attributes || {};
          const normalizedNewAttributeName = value.trim().toLowerCase();
          const existingAttributeNames = Object.keys(existingAttributes).map(
            (name) => name.toLowerCase()
          );

          if (existingAttributeNames.includes(normalizedNewAttributeName)) {
            return `El atributo "${value}" ya existe para esta variación.`;
          }
          return null;
        },
      });

      if (newAttributeName && newAttributeName.trim() !== "") {
        // If name is provided, prompt for attribute value
        const { value: newAttributeValue } = await Swal.fire({
          title: `Valor para "${newAttributeName}"`,
          input: "text",
          inputLabel: `Ingrese el valor para "${newAttributeName}" (ej: S, Algodón):`,
          inputPlaceholder: "Valor del atributo",
          showCancelButton: true,
          confirmButtonText: "Añadir",
          cancelButtonText: "Cancelar",
          inputValidator: (value) => {
            if (!value || value.trim() === "") {
              return "El valor del atributo no puede estar vacío.";
            }
            return null;
          },
        });

        if (newAttributeValue && newAttributeValue.trim() !== "") {
          const newVariations = [...variations];
          if (!newVariations[varIndex].attributes) {
            newVariations[varIndex].attributes = {};
          }

          newVariations[varIndex].attributes = {
            ...newVariations[varIndex].attributes,
            [newAttributeName.trim()]: newAttributeValue.trim(),
          };
          setVariations(newVariations);
          Swal.fire(
            "¡Atributo Añadido!",
            `"${newAttributeName}: ${newAttributeValue}" ha sido añadido.`,
            "success"
          );
        } else if (newAttributeValue === "") {
          Swal.fire(
            "Cancelado",
            "El valor del atributo no fue proporcionado.",
            "info"
          );
        }
      } else if (newAttributeName === "") {
        Swal.fire(
          "Cancelado",
          "El nombre del atributo no fue proporcionado.",
          "info"
        );
      }
    },
    [variations, setVariations]
  );
  const removeVariationAttribute = useCallback(
    (varIndex, attrName) => {
      Swal.fire({
        title: "¿Estás seguro?",
        text: `¿Quieres eliminar el atributo "${attrName}" de esta variación?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          const newVariations = [...variations];
          if (newVariations[varIndex].attributes) {
            const { [attrName]: _, ...rest } =
              newVariations[varIndex].attributes;
            newVariations[varIndex].attributes = rest;
            setVariations(newVariations);
            Swal.fire(
              "¡Eliminado!",
              "El atributo ha sido eliminado.",
              "success"
            );
          }
        }
      });
    },
    [variations, setVariations]
  );

  const handleVariationFileChange = useCallback(
    async (varIndex, field, e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsUploadingVariationImage(true);
      const currentVariations = [...variations];
      const oldImageUrl = currentVariations[varIndex][field];

      const variationId = currentVariations[varIndex].id || uuidv4();
      currentVariations[varIndex].id = variationId;

      const reader = new FileReader();
      reader.onloadend = () => {
        const newVariations = [...currentVariations];
        newVariations[varIndex][`${field}Preview`] = reader.result;
        newVariations[varIndex][`${field}File`] = file;
        setVariations(newVariations);
      };
      reader.readAsDataURL(file);

      try {
        const storageRef = ref(
          storage,
          `productos/${productId}/variations/${variationId}/${field}-${Date.now()}-${
            file.name
          }`
        );
        const uploadTask = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        const updatedVariations = [...variations];
        updatedVariations[varIndex][field] = downloadURL;
        updatedVariations[varIndex][`${field}Preview`] = downloadURL;
        updatedVariations[varIndex][`${field}File`] = null;
        setVariations(updatedVariations);

        if (
          oldImageUrl &&
          oldImageUrl !== downloadURL &&
          oldImageUrl.startsWith("https://firebasestorage.googleapis.com/")
        ) {
          try {
            const oldImageRef = ref(storage, oldImageUrl);
            await deleteObject(oldImageRef);
            console.log(`Old image ${oldImageUrl} deleted successfully.`);
          } catch (deleteError) {
            console.warn(
              `Could not delete old variation image ${oldImageUrl}:`,
              deleteError
            );
          }
        }
        Swal.fire(
          "¡Éxito!",
          "Imagen de variación subida correctamente.",
          "success"
        );
      } catch (error) {
        console.error("Error al subir imagen de variación:", error);
        Swal.fire(
          "Error",
          `Error al subir imagen de variación: ${error.message}`,
          "error"
        );

        const newVariations = [...variations];
        newVariations[varIndex][`${field}Preview`] = "";
        newVariations[varIndex][`${field}File`] = null;
        setVariations(newVariations);
      } finally {
        setIsUploadingVariationImage(false);
      }
    },
    [variations, setVariations, productId]
  );

  const handleVariationUrlChange = useCallback(
    (varIndex, field, e) => {
      const newVariations = [...variations];
      newVariations[varIndex][field] = e.target.value;
      newVariations[varIndex][`${field}Preview`] = e.target.value;
      newVariations[varIndex][`${field}File`] = null;
      setVariations(newVariations);
    },
    [variations, setVariations]
  );

  const addVariation = useCallback(() => {
    setVariations((prevVariations) => [
      ...prevVariations,
      {
        id: uuidv4(),
        attributes: {},
        precio: "",
        stock: "",
        imagen: "",
        imagenB: "",
        imagenC: "",
        imagenPreview: "",
        imagenBPreview: "",
        imagenCPreview: "",
        activo: true,
      },
    ]);
  }, [setVariations]);

  const removeVariation = useCallback(
    async (indexToRemove) => {
      const variationToRemove = variations[indexToRemove];

      const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: `¿Quieres eliminar la variación con ID "${
          variationToRemove.id ? variationToRemove.id.substring(0, 8) : "Nueva"
        }"? Esto eliminará también sus imágenes de Firebase Storage.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        setIsUploadingVariationImage(true);
        try {
          const imagesToDelete = [
            variationToRemove.imagen,
            variationToRemove.imagenB,
            variationToRemove.imagenC,
          ].filter(
            (url) =>
              url && url.startsWith("https://firebasestorage.googleapis.com/")
          );

          await Promise.all(
            imagesToDelete.map(async (url) => {
              try {
                const imageRef = ref(storage, url);
                await deleteObject(imageRef);
                console.log(`Deleted image from Storage: ${url}`);
              } catch (error) {
                if (error.code === "storage/object-not-found") {
                  console.warn(
                    `Image not found in Storage, skipping deletion: ${url}`
                  );
                } else {
                  console.error(`Failed to delete image ${url}:`, error);
                }
              }
            })
          );

          setVariations((prevVariations) =>
            prevVariations.filter((_, index) => index !== indexToRemove)
          );
          Swal.fire(
            "¡Eliminado!",
            "La variación y sus imágenes han sido eliminadas.",
            "success"
          );
        } catch (error) {
          console.error("Error al eliminar variación o sus imágenes:", error);
          Swal.fire(
            "Error",
            `Error al eliminar variación: ${error.message}`,
            "error"
          );
        } finally {
          setIsUploadingVariationImage(false);
        }
      }
    },
    [variations, setVariations]
  );

  return (
    <div className="variations-management">
      <h3>Variaciones del Producto</h3>

      {isUploadingVariationImage && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "20px 0",
            padding: "10px",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeeba",
            borderRadius: "8px",
          }}
        >
          <LoaderSpinner size="small" />{" "}
          <span style={{ marginLeft: "10px", color: "#856404" }}>
            Subiendo/Eliminando imágenes de variaciones...
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={addVariation}
        className="btn-secondary"
        disabled={isSubmitting || isUploadingVariationImage}
        style={{ marginBottom: "20px" }}
      >
        Añadir Nueva Variación
      </button>

      {variations.length === 0 && (
        <p className="info-message">
          Haz clic en "Añadir Nueva Variación" para empezar.
        </p>
      )}

      <div className="variations-list">
        {variations.map((variation, varIndex) => (
          <div
            key={variation.id || `new-${varIndex}`}
            className="variation-item"
          >
            <h4>
              Variación {varIndex + 1} (
              {variation.id ? variation.id.substring(0, 8) : "Nueva"})
            </h4>

            {}
            <div
              className="variation-attributes-section"
              style={{
                marginBottom: "15px",
                padding: "10px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h5>Atributos de esta Variación:</h5>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "10px",
                }}
              >
                {Object.entries(variation.attributes || {}).map(
                  ([attrName, attrValue]) => (
                    <div
                      key={attrName}
                      className="attribute-chip"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#e2e6ea",
                        borderRadius: "5px",
                        padding: "5px 10px",
                        fontSize: "0.9em",
                        gap: "5px",
                      }}
                    >
                      <span>
                        {attrName}: <strong>{attrValue}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          removeVariationAttribute(varIndex, attrName)
                        }
                        disabled={isSubmitting || isUploadingVariationImage}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#dc3545",
                          cursor: "pointer",
                          fontSize: "1.1em",
                          padding: "0 3px",
                        }}
                        title={`Eliminar atributo ${attrName}`}
                      >
                        &times;
                      </button>
                    </div>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={() => addVariationAttribute(varIndex)}
                disabled={isSubmitting || isUploadingVariationImage}
                className="btn-secondary"
                style={{ fontSize: "0.9em", padding: "6px 10px" }}
              >
                Añadir Atributo
              </button>
            </div>

            {}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`var-precio-${varIndex}`}>Precio ($):</label>
                <input
                  id={`var-precio-${varIndex}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={variation.precio}
                  onChange={(e) =>
                    handleVariationChange(varIndex, "precio", e.target.value)
                  }
                  disabled={isSubmitting || isUploadingVariationImage}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor={`var-stock-${varIndex}`}>Stock:</label>
                <input
                  id={`var-stock-${varIndex}`}
                  type="number"
                  step="1"
                  min="0"
                  value={variation.stock}
                  onChange={(e) =>
                    handleVariationChange(varIndex, "stock", e.target.value)
                  }
                  disabled={isSubmitting || isUploadingVariationImage}
                  required
                />
              </div>
            </div>

            {}
            <div
              className="form-group checkbox-group"
              style={{ marginBottom: "15px" }}
            >
              <input
                id={`var-activo-${varIndex}`}
                type="checkbox"
                checked={variation.activo}
                onChange={(e) =>
                  handleVariationChange(varIndex, "activo", e.target.checked)
                }
                disabled={isSubmitting || isUploadingVariationImage}
                style={{ marginRight: "8px", transform: "scale(1.2)" }}
              />
              <label htmlFor={`var-activo-${varIndex}`}>Variación Activa</label>
            </div>

            {}
            {[
              { field: "imagen", label: "Imagen Principal" },
              { field: "imagenB", label: "Imagen Adicional B" },
              { field: "imagenC", label: "Imagen Adicional C" },
            ].map((imgInfo) => (
              <div
                key={`${varIndex}-${imgInfo.field}`}
                className="form-group image-upload-group"
              >
                <label htmlFor={`var-${imgInfo.field}Url-${varIndex}`}>
                  {imgInfo.label} (URL o Subir Archivo)
                </label>
                <div className="image-inputs">
                  <input
                    id={`var-${imgInfo.field}Url-${varIndex}`}
                    type="url"
                    value={variation[imgInfo.field] || ""}
                    onChange={(e) =>
                      handleVariationUrlChange(varIndex, imgInfo.field, e)
                    }
                    placeholder={`URL ${imgInfo.label}`}
                    disabled={isSubmitting || isUploadingVariationImage}
                  />
                  <span style={{ margin: "0 10px" }}>O</span>
                  <input
                    type="file"
                    id={`var-${imgInfo.field}File-${varIndex}`}
                    accept="image/*"
                    onChange={(e) =>
                      handleVariationFileChange(varIndex, imgInfo.field, e)
                    }
                    disabled={isSubmitting || isUploadingVariationImage}
                  />
                </div>
                {variation[`${imgInfo.field}Preview`] && (
                  <img
                    src={variation[`${imgInfo.field}Preview`]}
                    alt={`Vista previa ${imgInfo.label}`}
                    className="image-preview"
                  />
                )}
              </div>
            ))}

            {}
            <button
              type="button"
              onClick={() => removeVariation(varIndex)}
              className="btn-delete"
              disabled={isSubmitting || isUploadingVariationImage}
              style={{ marginTop: "15px" }}
            >
              Eliminar Variación
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VariationManager;
