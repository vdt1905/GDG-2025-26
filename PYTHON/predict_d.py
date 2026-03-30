import torch
from torchvision import models, transforms
from PIL import Image
from io import BytesIO




def load_model(weights_path, num_classes):
    model = models.densenet121(weights=None)
    num_features = model.classifier.in_features
    model.classifier = torch.nn.Sequential(
        torch.nn.Linear(num_features, 512),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.4),
        torch.nn.Linear(512, 256),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.3),
        torch.nn.Linear(256, num_classes)
    )
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.load_state_dict(torch.load(weights_path, map_location=device, weights_only=False))
    model.to(device)
    model.eval()
    return model


# Load model once at startup to save memory and time
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_weights_path = os.path.join(os.path.dirname(__file__), "models", "model_epoch_25.pth") if os.path.exists(os.path.join(os.path.dirname(__file__), "models", "model_epoch_25.pth")) else r"./models/model_epoch_25.pth"
_GLOBAL_MODEL_D = load_model(_weights_path, num_classes=23)

def predict_d(image: Image.Image):
    class_names = [
    "Acne and Rosacea Photos", "Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions",
    "Atopic Dermatitis Photos", "Bullous Disease Photos", "Cellulitis Impetigo and other Bacterial Infections",
    "Eczema Photos", "Exanthems and Drug Eruptions", "Hair Loss Photos Alopecia and other Hair Diseases",
    "Herpes HPV and other STDs Photos", "Light Diseases and Disorders of Pigmentation",
    "Lupus and other Connective Tissue diseases", "Melanoma Skin Cancer Nevi and Moles",
    "Nail Fungus and other Nail Disease", "Poison Ivy Photos and other Contact Dermatitis",
    "Psoriasis pictures Lichen Planus and related diseases", "Scabies Lyme Disease and other Infestations and Bites",
    "Seborrheic Keratoses and other Benign Tumors", "Systemic Disease", "Tinea Ringworm Candidiasis and other Fungal Infections",
    "Urticaria Hives", "Vascular Tumors", "Vasculitis Photos", "Warts Molluscum and other Viral Infections"
    ]
    
    transform = transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    input_tensor = transform(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        output = _GLOBAL_MODEL_D(input_tensor)
        probabilities = torch.softmax(output, dim=1)
        predicted_class = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0, predicted_class].item()
    return {"class": class_names[predicted_class], "confidence": confidence}

