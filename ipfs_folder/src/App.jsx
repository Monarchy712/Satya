import React, { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

export default function App() {
  const [files, setFiles] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔑 Pinata Keys
  const PINATA_API_KEY = "cbe8505e82a50b088525";
  const PINATA_SECRET_KEY = "35e2636d1a81f2673f53ed1938100037b995cc53aaa16bed6b844e1f57b39fec";

  // 🔗 Your contract
  const CONTRACT_ADDRESS = "0x889479cD233699D5289AFb0eaC760b74e54f0cc7";


  const ABI = [
    "function submitReport(string cid, bytes32 identityHash, uint256 confidence)"
  ];

  // Handle file selection
  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  // Upload image to IPFS with custom name
  const uploadFile = async (file, fileName) => {
    const formData = new FormData();

    const renamedFile = new File([file], fileName, {
      type: file.type,
    });

    formData.append("file", renamedFile);

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    return res.data.IpfsHash;
  };

  // Upload JSON with filename metadata
  const uploadJSON = async (data, fileName) => {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataMetadata: {
          name: fileName,
        },
        pinataContent: data,
      },
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    return res.data.IpfsHash;
  };

  // Submit flow
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!files.length) {
        alert("Please upload at least one image");
        return;
      }

      const timestamp = Date.now();

      setStatus("Uploading images...");

      let imagesData = [];

      // Upload all images with timestamp naming
      for (let i = 0; i < files.length; i++) {
        const ext = files[i].name.split(".").pop() || "jpg";
        const fileName = `${timestamp}_${i + 1}.${ext}`;

        const cid = await uploadFile(files[i], fileName);

        imagesData.push({
          name: `${timestamp}_${i + 1}`,
          url: `ipfs://${cid}`,
        });
      }

      setStatus("Creating report JSON...");

      const reportData = {
        timestamp,
        description: text,
        images: imagesData,
      };

      // Upload JSON as timestamp.json
      const finalCID = await uploadJSON(reportData, `${timestamp}.json`);

      console.log("Final CID:", finalCID);

      setStatus("Sending to blockchain...");

      // 🔥 Auto transaction (no MetaMask)
      const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE";
      const PRIVATE_KEY = "5ea88a49a9c4c7b4a398a08554b78b7018c2dab03d7d4b920529aa17199c84a6"; // ⚠️ test wallet only


      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

      const identityHash = ethers.keccak256(
        ethers.toUtf8Bytes("demo-user")
      );

      const confidence = 80;

      const tx = await contract.submitReport(
        finalCID,
        identityHash,
        confidence
      );

      await tx.wait();

      console.log("Transaction done:", tx.hash);

      setStatus("✅ Report submitted successfully!");

      // Reset form
      setFiles([]);
      setText("");

    } catch (err) {
      console.error(err);
      setStatus("❌ Error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h2>Infrastructure Report</h2>

      {/* File Upload */}
      <input type="file" multiple onChange={handleFileChange} />

      <br /><br />

      {/* Description */}
      <textarea
        placeholder="Enter description"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        cols={50}
      />

      <br /><br />

      {/* Submit Button */}
      <button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Report"}
      </button>

      <br /><br />

      <p>{status}</p>
    </div>
  );
}