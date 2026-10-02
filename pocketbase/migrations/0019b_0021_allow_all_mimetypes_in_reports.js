migrate(
  (app) => {
    // Mantém a collection reports aceitando mimetypes amplos
    const col = app.findCollectionByNameOrId('reports')
    const fileField = col.fields.getByName('file')
    if (fileField) {
      fileField.mimeTypes = []
      app.save(col)
    }
  },
  (app) => {},
)
