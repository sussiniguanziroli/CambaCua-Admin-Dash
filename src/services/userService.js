import { db } from "../firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const usersCollectionRef = collection(db, "users");

export const getAllUsers = async () => {
  const q = query(usersCollectionRef, orderBy("nombre"));
  const querySnapshot = await getDocs(q);
  const users = querySnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));
  return users;
};