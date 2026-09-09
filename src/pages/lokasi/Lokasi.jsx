import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { canManageLocations } from "../../utils/access";

import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";


/* =========================================
   FIX ICON LEAFLET
========================================= */

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});


/* =========================================
   NORMALISASI RESPONSE BACKEND
========================================= */

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};


/* =========================================
   NORMALISASI DATA LOKASI
========================================= */

const normalizeLocation = (location) => {
  return {
    id: location.id,

    name:
      location.name ||
      location.nama ||
      location.nama_lokasi ||
      location.nama_tempat ||
      "Lokasi Presensi",

    address:
      location.address ||
      location.alamat ||
      location.work_unit?.name ||
      location.unit ||
      "-",

    latitude: Number(
      location.latitude ||
      location.lat ||
      0
    ),

    longitude: Number(
      location.longitude ||
      location.lng ||
      location.lon ||
      0
    ),

    radius: Number(
      location.radius_meters ||
      location.radius ||
      100
    ),

    is_active:
      location.is_active !== false,
  };
};


/* =========================================
   COMPONENT UNTUK MENGUBAH POSISI MAP
========================================= */

function MapController({ locations }) {
  const map = useMap();

  useEffect(() => {

    const validLocations = locations.filter(
      (location) =>
        location.latitude &&
        location.longitude
    );

    if (validLocations.length > 0) {

      const bounds = validLocations.map(
        (location) => [
          location.latitude,
          location.longitude,
        ]
      );

      map.fitBounds(bounds, {
        padding: [50, 50],
      });

    }

  }, [locations, map]);

  return null;
}


/* =========================================
   HALAMAN LOKASI
========================================= */

function Lokasi() {

  const canManage = canManageLocations();


  /* =========================================
     STATE
  ========================================= */

  const [locations, setLocations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [deletingId, setDeletingId] =
    useState(null);


  /* =========================================
     DEFAULT MAP
  ========================================= */

  const defaultPosition = [
    -0.899,
    119.870,
  ];


  /* =========================================
     AMBIL DATA LOKASI
  ========================================= */

  const fetchLocations = async () => {

    try {

      setLoading(true);

      setError("");


      const response =
        await apiRequest(
          "/work-locations"
        );


      const data =
        normalizeArray(response)
          .map(normalizeLocation);


      setLocations(data);

    } catch (err) {

      console.error(
        "Gagal mengambil lokasi:",
        err
      );


      setError(
        err.message ||
        "Gagal mengambil data lokasi."
      );


      setLocations([]);

    } finally {

      setLoading(false);

    }

  };


  /* =========================================
     LOAD PERTAMA
  ========================================= */

  useEffect(() => {

    fetchLocations();

  }, []);


  /* =========================================
     TAMBAH LOKASI
  ========================================= */

  const handleAddLocation =
    async (e) => {

      e.preventDefault();


      const form =
        new FormData(
          e.target
        );


      try {

        setLoading(true);

        setFormError("");


        const name =
          form.get("name");

        const address =
          form.get("address");

        const latitude =
          form.get("latitude");

        const longitude =
          form.get("longitude");

        const radius =
          form.get(
            "radius_meters"
          );


        /* VALIDASI */

        if (
          !name ||
          name.trim() === ""
        ) {

          throw new Error(
            "Nama lokasi wajib diisi."
          );

        }


        if (
          latitude === "" ||
          longitude === ""
        ) {

          throw new Error(
            "Latitude dan longitude wajib diisi."
          );

        }


        /* REQUEST API */

        await apiRequest(
          "/work-locations",
          {

            method: "POST",

            body: JSON.stringify({

              name:
                name.trim(),

              address:
                address || "",

              latitude:
                Number(latitude),

              longitude:
                Number(longitude),

              radius_meters:
                Number(radius) || 100,

              is_active:
                true,

            }),

          }
        );


        /* TUTUP MODAL */

        setShowModal(false);


        /* RESET ERROR */

        setFormError("");


        /* REFRESH DATA */

        await fetchLocations();


      } catch (err) {

        console.error(
          "Gagal menambahkan lokasi:",
          err
        );


        setFormError(
          err.message ||
          "Gagal menambahkan lokasi."
        );

      } finally {

        setLoading(false);

      }

    };


  /* =========================================
     HAPUS LOKASI
  ========================================= */

  const handleDeleteLocation =
    async (location) => {

      const confirmed =
        window.confirm(
          `Yakin ingin menghapus lokasi "${location.name}"?`
        );


      if (!confirmed) {

        return;

      }


      try {

        setDeletingId(
          location.id
        );


        setError("");


        await apiRequest(
          `/work-locations/${location.id}`,
          {

            method:
              "DELETE",

          }
        );


        await fetchLocations();


      } catch (err) {

        console.error(
          "Gagal menghapus lokasi:",
          err
        );


        setError(
          err.message ||
          "Gagal menghapus lokasi."
        );


      } finally {

        setDeletingId(
          null
        );

      }

    };


  /* =========================================
     VALID LOCATION
  ========================================= */

  const validLocations =
    locations.filter(
      (location) =>
        location.latitude !== 0 &&
        location.longitude !== 0
    );


  /* =========================================
     RENDER
  ========================================= */

  return (

    <AdminLayout>

      <div className="location-page">


        {/* =================================
            HEADER
        ================================= */}

        <div className="page-heading">

          <div>

            <h2>
              Lokasi & Geofence
            </h2>

            <p>
              Kelola titik presensi dan radius
              geofence
            </p>

          </div>


          {canManage && (

            <button
              className="primary-button"
              onClick={() =>
                setShowModal(true)
              }
            >

              + Tambah Lokasi

            </button>

          )}

        </div>


        {/* =================================
            ERROR
        ================================= */}

        {error && (

          <div className="form-error">

            {error}

          </div>

        )}


        {/* =================================
            MAIN LAYOUT
        ================================= */}

        <div className="location-layout">


          {/* =================================
              MAP
          ================================= */}

          <section
            className="
              data-panel
              location-map-panel
            "
          >

            <div
              className="
                location-map-leaflet
              "
            >


              <MapContainer

                center={
                  validLocations.length > 0
                    ? [
                        validLocations[0]
                          .latitude,

                        validLocations[0]
                          .longitude,
                      ]
                    : defaultPosition
                }

                zoom={15}

                scrollWheelZoom={
                  true
                }

                style={{
                  width: "100%",
                  height: "100%",
                }}

              >


                {/* TILE MAP */}

                <TileLayer

                  attribution="
                    &copy;
                    OpenStreetMap contributors
                  "

                  url="
                    https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
                  "

                />


                {/* AUTO ZOOM */}

                <MapController
                  locations={
                    validLocations
                  }
                />


                {/* MARKER */}

                {validLocations.map(
                  (location) => (

                    <Marker

                      key={
                        location.id
                      }

                      position={[
                        location.latitude,

                        location.longitude,
                      ]}

                    >


                      {/* POPUP */}

                      <Popup>

                        <strong>
                          {location.name}
                        </strong>

                        <br />

                        {location.address}

                        <br />

                        Radius:

                        {" "}

                        {
                          location.radius
                        }

                        m

                      </Popup>


                    </Marker>

                  )
                )}


                {/* GEOFENCE */}

                {validLocations.map(
                  (location) => (

                    <Circle

                      key={
                        `circle-${location.id}`
                      }

                      center={[
                        location.latitude,

                        location.longitude,
                      ]}

                      radius={
                        location.radius
                      }

                    />

                  )
                )}


              </MapContainer>


              {/* EMPTY MAP */}

              {
                !loading &&
                validLocations.length === 0 && (

                  <div
                    className="
                      map-empty-overlay
                    "
                  >

                    Belum ada titik lokasi

                  </div>

                )
              }


            </div>

          </section>


          {/* =================================
              LIST LOKASI
          ================================= */}

          <section
            className="
              location-list-section
            "
          >


            {/* HEADER LIST */}

            <div
              className="
                location-list-heading
              "
            >

              <h3>
                Titik Presensi
              </h3>


              <button

                className="
                  secondary-button
                "

                onClick={
                  fetchLocations
                }

                disabled={
                  loading
                }

              >

                {loading
                  ? "Memuat..."
                  : "↻ Refresh"}

              </button>

            </div>


            {/* LOADING */}

            {
              loading && (

                <div
                  className="
                    empty-state
                  "
                >

                  Memuat lokasi...

                </div>

              )
            }


            {/* DATA */}

            {
              !loading &&
              !error &&
              locations.map(
                (location) => (

                  <article

                    className="
                      location-card
                    "

                    key={
                      location.id
                    }

                  >


                    {/* ICON */}

                    <div
                      className="
                        location-icon
                      "
                    >

                      📍

                    </div>


                    {/* INFO */}

                    <div
                      className="
                        location-card-main
                      "
                    >

                      <strong>

                        {
                          location.name
                        }

                      </strong>


                      <span>

                        {
                          location.address
                        }

                      </span>

                    </div>


                    {/* RADIUS */}

                    <div
                      className="
                        location-radius
                      "
                    >

                      <span>

                        R{" "}

                        {
                          location.radius
                        }

                        m

                      </span>


                      <small
                        className={
                          location.is_active
                            ? "status-active"
                            : "status-inactive"
                        }
                      >

                        {
                          location.is_active
                            ? "Aktif"
                            : "Nonaktif"
                        }

                      </small>

                    </div>


                    {/* HAPUS */}

                    {
                      canManage && (

                        <button

                          className="
                            delete-location-button
                          "

                          onClick={() =>
                            handleDeleteLocation(
                              location
                            )
                          }

                          disabled={
                            deletingId ===
                            location.id
                          }

                        >

                          {
                            deletingId ===
                            location.id

                              ? "Menghapus..."

                              : "Hapus"

                          }

                        </button>

                      )
                    }


                  </article>

                )
              )
            }


            {/* EMPTY */}

            {
              !loading &&
              !error &&
              locations.length === 0 && (

                <div
                  className="
                    empty-state
                  "
                >

                  Belum ada lokasi terdaftar.

                </div>

              )
            }


          </section>


        </div>


        {/* =================================
            MODAL TAMBAH LOKASI
        ================================= */}

        {
          showModal && (

            <div

              className="
                modal-overlay
              "

              onClick={() =>
                setShowModal(false)
              }

            >


              <div

                className="
                  employee-modal
                "

                onClick={(e) =>
                  e.stopPropagation()
                }

              >


                {/* HEADER MODAL */}

                <div
                  className="
                    modal-header
                  "
                >

                  <div>

                    <h3>
                      Tambah Titik Presensi
                    </h3>

                    <p>
                      Tambahkan lokasi
                      dan radius geofence
                    </p>

                  </div>


                  <button

                    className="
                      modal-close
                    "

                    type="button"

                    onClick={() =>
                      setShowModal(false)
                    }

                  >

                    ×

                  </button>


                </div>


                {/* ERROR FORM */}

                {
                  formError && (

                    <div
                      className="
                        form-error
                      "
                    >

                      {
                        formError
                      }

                    </div>

                  )
                }


                {/* FORM */}

                <form
                  onSubmit={
                    handleAddLocation
                  }
                >


                  <div
                    className="
                      form-grid
                    "
                  >


                    {/* NAMA */}

                    <div
                      className="
                        form-field
                      "
                    >

                      <label>
                        Nama Lokasi*
                      </label>


                      <input

                        name="name"

                        type="text"

                        required

                        placeholder="
                          Contoh: Gedung Rektorat
                        "

                      />

                    </div>


                    {/* ALAMAT */}

                    <div
                      className="
                        form-field
                      "
                    >

                      <label>
                        Alamat
                      </label>


                      <input

                        name="address"

                        type="text"

                        placeholder="
                          Masukkan alamat lokasi
                        "

                      />

                    </div>


                    {/* LATITUDE */}

                    <div
                      className="
                        form-field
                      "
                    >

                      <label>
                        Latitude*
                      </label>


                      <input

                        name="latitude"

                        type="number"

                        step="any"

                        required

                        placeholder="
                          -0.900000
                        "

                      />

                    </div>


                    {/* LONGITUDE */}

                    <div
                      className="
                        form-field
                      "
                    >

                      <label>
                        Longitude*
                      </label>


                      <input

                        name="longitude"

                        type="number"

                        step="any"

                        required

                        placeholder="
                          119.870000
                        "

                      />

                    </div>


                    {/* RADIUS */}

                    <div
                      className="
                        form-field
                      "
                    >

                      <label>
                        Radius Geofence
                        (meter)
                      </label>


                      <input

                        name="
                          radius_meters
                        "

                        type="number"

                        min="10"

                        defaultValue="100"

                        placeholder="100"

                      />

                    </div>


                  </div>


                  {/* ACTION */}

                  <div
                    className="
                      modal-actions
                    "
                  >


                    <button

                      type="button"

                      className="
                        secondary-button
                      "

                      onClick={() =>
                        setShowModal(false)
                      }

                    >

                      Batal

                    </button>


                    <button

                      type="submit"

                      className="
                        primary-button
                      "

                      disabled={
                        loading
                      }

                    >

                      {
                        loading
                          ? "Menyimpan..."
                          : "Simpan Lokasi"
                      }

                    </button>


                  </div>


                </form>


              </div>


            </div>

          )
        }


      </div>


    </AdminLayout>

  );

}


export default Lokasi;