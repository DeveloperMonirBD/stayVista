import axios from "axios";

// Image upload
export const imageUpload = async (image) => {
     const formData = new FormData();
    formData.append('image', image);
    
     let imageUrl = '';

     if (formData) {
         const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, formData);

         imageUrl = uploadRes?.data?.data?.display_url;

         if (!imageUrl) {
             throw new Error('Image upload failed');
         }

         return imageUrl;
     }
}