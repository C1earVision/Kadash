import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';


import axios from 'axios';
// import logo from '../images/Logo.png';
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";



const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    dob: '',
    phoneNumbers: [''],
    confirmPassword: ''
  });
  const [location, setLocation] = useState({
    country: '',
    city: '',
    street: '',
    state: '',
    zip: '',
    lat: 31.208870,
    lng: 29.909201,
  });
  const [error, setError] = useState('');
  const [data, setData] = useState('');


  const handleChange = (e, index = null) => {
    const { name, value } = e.target;

    if (name === 'phoneNumbers' && index !== null) {
      const updatedPhoneNumbers = [...formData.phoneNumbers];
      updatedPhoneNumbers[index] = value;
      setFormData({ ...formData, phoneNumbers: updatedPhoneNumbers });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addPhoneNumberField = () => {
    setFormData({ ...formData, phoneNumbers: [...formData.phoneNumbers, ''] });
  };

  const removePhoneNumberField = (index) => {
    const updatedPhoneNumbers = formData.phoneNumbers.filter((_, i) => i !== index);
    setFormData({ ...formData, phoneNumbers: updatedPhoneNumbers });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }
    setError('');
    const { confirmPassword, ...formDataFiltered } = formData;
    const { lat, lng, ...locationFiltered } = location;

    setData({ ...formDataFiltered, ...locationFiltered });
  };

  useEffect(() => {
    const sendData = async () => {
      if (data) {
        try {
          console.log('Form Submitted:', { ...data });
          const url = `${API_URL}/auth/register`;
          const user = await axios.post(url, {
            ...data
          });

          localStorage.setItem('user', JSON.stringify(user.data));
          const adminState = user.data.user.AdminState;
          navigate(adminState === 1 ? '/agent' : '/chatbot');
        } catch (error) {
          alert('Email or password wrong');
          console.error('Error logging in:', error);
        }
      }
    };
    sendData();
  }, [data]);



  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setLocation({ ...location, lat, lng });

        // Fetch address details from OpenStreetMap Nominatim API
        axios
          .get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then((response) => {
            const { address } = response.data;
            setLocation({
              lat,
              lng,
              country: address.country || '',
              city: address.city || address.town || address.village || '',
              street: address.road || '',
              state: address.state || '',
              zip: address.postcode || '',
            });
          })
          .catch((error) => console.error('Error fetching location data:', error));
      },
    });
    return location.lat && location.lng ? <Marker position={[location.lat, location.lng]} /> : null;
  };

  return (
    <div className="min-h-scree flex items-center justify-center p-5 bg-[#1F263A]">
      <div className="bg-[rgb(33,43,68)] p-8 rounded-lg shadow-lg max-w-2xl w-full">
        {/* <div className="text-center mb-8 flex justify-center">
          <img src={logo} alt="Your Logo" className="w-48 h-48" />
        </div> */}
        <form onSubmit={handleSubmit} className='text-white'>
          <div className="mb-4">
            <label className="block ">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full text-gray-600 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block">Phone Numbers</label>
            {formData.phoneNumbers.map((number, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  name="phoneNumbers"
                  value={number}
                  onChange={(e) => handleChange(e, index)}
                  className="flex-1 text-gray-600 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
                  required
                />
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removePhoneNumberField(index)}
                    className="ml-2 bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPhoneNumberField}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Add Phone Number
            </button>
          </div>
          <div className="mb-4">
            <label className="block ">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full text-gray-600 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block ">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full text-gray-600 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block ">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full text-gray-600 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block ">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="w-full text-gray-600 px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block ">Choose Your Location</label>
            <div className="h-64 w-full border rounded-lg overflow-hidden">
              <MapContainer center={[location.lat, location.lng]} zoom={13} className="h-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker />
              </MapContainer>
            </div>
            {location.country && (
              <div className="mt-4 text-white">
                <p>Country: {location.country}</p>
                <p>City: {location.city}</p>
                <p>Street: {location.street}</p>
                <p>State: {location.state}</p>
                <p>Zip Code: {location.zip}</p>
              </div>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[rgb(149,171,82)] text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:border-blue-300"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;