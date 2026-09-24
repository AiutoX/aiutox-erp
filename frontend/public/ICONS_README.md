# Iconos PWA - AiutoX ERP

Este directorio debe contener los siguientes iconos para la PWA:

## Iconos Requeridos

1. **icon-72x72.png** - 72x72 píxeles
2. **icon-96x96.png** - 96x96 píxeles
3. **icon-128x128.png** - 128x128 píxeles
4. **icon-144x144.png** - 144x144 píxeles
5. **icon-152x152.png** - 152x152 píxeles
6. **icon-192x192.png** - 192x192 píxeles
7. **icon-384x384.png** - 384x384 píxeles
8. **icon-512x512.png** - 512x512 píxeles
9. **apple-touch-icon.png** - 180x180 píxeles (para iOS)

## Generación de Iconos

### Opción 1: Herramientas Online

1. Usar [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
2. Subir `logo.png` como base
3. Generar todos los tamaños automáticamente

### Opción 2: ImageMagick

```bash
# Desde logo.png (asumiendo que existe)
convert logo.png -resize 72x72 icon-72x72.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 512x512 icon-512x512.png
convert logo.png -resize 180x180 apple-touch-icon.png
```

### Opción 3: Photoshop/GIMP

1. Abrir `logo.png`
2. Exportar en cada tamaño requerido
3. Guardar con nombres exactos especificados arriba

## Notas

- Todos los iconos deben ser PNG con fondo transparente o sólido
- El logo base debe tener al menos 512x512 píxeles para buena calidad
- Los iconos deben seguir la guía de marca de AiutoX (ver `docs/60-brand/`)
