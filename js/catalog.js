window.ATLAS_CATALOG = {
  source: "Anatria3D / Z-Anatomy / BodyParts3D",
  license: "CC BY-SA 4.0",
  cdn: [
    "./anatomy/",
    "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@main/public/anatomy/",
    "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/main/public/anatomy/"
  ],
  scenePatterns: {
    orientation: "frontal bone|parietal bone|occipital bone|temporal bone|sphenoid bone|ethmoid bone|zygomatic bone|nasal bone|mandible$|maxilla \\(|vomer|hyoid bone",
    chest: "^diaphragm$|superior lobe of left lung|superior lobe of right lung|inferior lobe of left lung|inferior lobe of right lung|middle lobe of right lung|^trachea$|body of sternum|manubrium of sternum|external intercostal muscles",
    ear: "helix|antihelix|tragus|antitragus|concha of auricle|lobule of auricle|apex of auricle|crura of antihelix|auricular tubercle|temporal bone|malleus|incus|stapes|tympanic membrane|^cochlea|vestibule|auditory tube|facial nerve \\(vii\\)|vestibulocochlear|cochlear nerve|vestibular nerve|mastoid region",
    cochlea: "^cochlea|vestibule|cochlear nerve|vestibular nerve|vestibulocochlear|tympanic membrane|malleus|incus|stapes|temporal bone|cochlear nucle|inferior colliculus|medial geniculate",
    larynx: "thyroid cartilage|cricoid cartilage|arytenoid cartilage|corniculate cartilage|hyoid bone|epiglottis|^trachea$|posterior crico-arytenoid|lateral crico-arytenoid|transverse arytenoid|thyro-arytenoid|cricothyroid|quadrangular membrane|thyrohyoid muscle|sternohyoid",
    swallow: "^tongue$|soft palate|uvula of palate|nasopharynx|oropharynx|laryngopharynx|^oesophagus$|epiglottis|hyoid bone|mandible$|pharyngeal constrictor|palatopharyngeus|mylohyoid muscle|geniohyoid|thyroid cartilage|cricoid cartilage|arytenoid cartilage|genioglossus|hyoglossus",
    brain: "inferior frontal gyrus|transverse temporal|superior temporal sulcus|middle temporal gyrus|supramarginal|angular gyrus|precentral gyrus|postcentral gyrus|insula|thalamus|putamen|caudate nucleus|pons|medulla oblongata|inferior colliculus|medial geniculate|cochlear nucle|corpus callosum|lateral ventricle|hypothalamus|cerebellum|tentorium|trigeminal nerve|facial nerve \\(vii\\)|vestibulocochlear|glossopharyngeal|vagus nerve|hypoglossal|accessory nerve \\(xi\\)|middle cerebral artery \\(m1|basilar artery$"
  }
};
