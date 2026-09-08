const countFromValue = (value) => {
  if (Array.isArray(value)) return value.length;

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

/**
 * Menormalkan status enrollment dari variasi respons API. Embedding tidak
 * pernah dipakai/ditampilkan oleh web; yang dipakai hanya jumlah sampelnya.
 */
export const getFaceSampleCount = (employee = {}) => {
  const countFields = [
    "face_data_count",
    "face_samples",
    "face_count",
    "face_enrollment_count",
    "biometric_count",
    "wajah_count",
    "face",
    "wajah",
  ];

  for (const field of countFields) {
    const count = countFromValue(employee[field]);
    if (count > 0) return count;
  }

  const collectionFields = [
    "face_data",
    "faceData",
    "face_samples_data",
    "biometric_data",
    "biometrics",
  ];

  for (const field of collectionFields) {
    const count = countFromValue(employee[field]);
    if (count > 0) return count;
  }

  const enrolledFields = [
    "has_face_data",
    "has_face",
    "face_registered",
    "is_face_registered",
    "face_enrolled",
    "biometric_registered",
  ];

  return enrolledFields.some((field) => [true, 1, "1", "true"].includes(employee[field]))
    ? 1
    : 0;
};

export const hasFaceEnrollment = (employee) => getFaceSampleCount(employee) > 0;
