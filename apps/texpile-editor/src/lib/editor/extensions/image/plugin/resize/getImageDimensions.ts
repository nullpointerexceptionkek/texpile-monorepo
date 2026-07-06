const getImageDimensions = async (src: string) => {
	const image = new Image();
	const completed: boolean = await new Promise((res) => {
		image.onload = () => res(true);
		image.onerror = () => res(false);
		image.src = src;
	});
	return { width: image.naturalWidth, height: image.naturalHeight, completed };
};

export default getImageDimensions;
