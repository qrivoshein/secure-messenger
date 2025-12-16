import cv2
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
from typing import Dict, Any
from .base_parser import BaseParser

class ImageParser(BaseParser):
    def parse(self, file_path: str) -> Dict[str, Any]:
        result = self.create_result_structure()
        
        try:
            img = Image.open(file_path)
            
            # Расширенные метаданные изображения
            result['metadata'] = {
                'type': 'image',
                'format': img.format,
                'mode': img.mode,
                'size': img.size,
                'width': img.width,
                'height': img.height,
                'dpi': img.info.get('dpi', (72, 72)),
                'has_transparency': img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info),
            }
            
            # OCR с предобработкой
            try:
                # Базовый OCR без предобработки
                text_basic = pytesseract.image_to_string(img, lang='eng+rus')
                
                # Улучшенный OCR с предобработкой
                processed_img = self._preprocess_image(img)
                text_enhanced = pytesseract.image_to_string(processed_img, lang='eng+rus')
                
                # Выбрать лучший результат (по длине текста)
                text = text_enhanced if len(text_enhanced) > len(text_basic) else text_basic
                
                # Детальный анализ OCR
                ocr_data = pytesseract.image_to_data(processed_img, lang='eng+rus', output_type=pytesseract.Output.DICT)
                
                # Извлечение структурированных блоков текста
                blocks = []
                current_block = []
                for i in range(len(ocr_data['text'])):
                    conf = int(ocr_data['conf'][i])
                    text_item = ocr_data['text'][i].strip()
                    
                    if conf > 0 and text_item:
                        current_block.append({
                            'text': text_item,
                            'confidence': conf,
                            'bbox': {
                                'left': ocr_data['left'][i],
                                'top': ocr_data['top'][i],
                                'width': ocr_data['width'][i],
                                'height': ocr_data['height'][i]
                            }
                        })
                    elif current_block:
                        blocks.append({
                            'type': 'text_block',
                            'words': current_block,
                            'text': ' '.join([w['text'] for w in current_block])
                        })
                        current_block = []
                
                if current_block:
                    blocks.append({
                        'type': 'text_block',
                        'words': current_block,
                        'text': ' '.join([w['text'] for w in current_block])
                    })
                
                result['content']['text'] = text.strip()
                result['content']['structure'] = blocks
                
                # Статистика OCR
                result['metadata']['ocr_confidence'] = np.mean([w['confidence'] for block in blocks for w in block['words']]) if blocks else 0
                result['metadata']['word_count'] = sum([len(block['words']) for block in blocks])
                result['metadata']['block_count'] = len(blocks)
                
            except Exception as ocr_error:
                result['metadata']['ocr_error'] = str(ocr_error)
                result['content']['text'] = ''
                result['content']['structure'] = []
            
        except Exception as e:
            result['metadata']['error'] = str(e)
        
        return result
    
    def _preprocess_image(self, img: Image.Image) -> Image.Image:
        """Предобработка изображения для улучшения качества OCR"""
        # Конвертация в RGB если необходимо
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Конвертация PIL в OpenCV
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Преобразование в оттенки серого
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # Увеличение контрастности
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Шумоподавление
        denoised = cv2.fastNlMeansDenoising(enhanced)
        
        # Бинаризация (Otsu)
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Конвертация обратно в PIL
        processed_img = Image.fromarray(binary)
        
        return processed_img
